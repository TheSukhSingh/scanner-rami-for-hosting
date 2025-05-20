from sqlalchemy.orm import Session as _Session
_orig_get_bind = _Session.get_bind
def _patched_get_bind(self, *args, **kwargs):
    kwargs.pop('bind', None)
    return _orig_get_bind(self, *args, **kwargs)
_Session.get_bind = _patched_get_bind

try:
    from flask_sqlalchemy import SignallingSession
    SignallingSession.get_bind = _patched_get_bind
except ImportError:
    pass

from dotenv import load_dotenv
load_dotenv()

import os
from flask import Flask, redirect, request, jsonify, current_app, url_for
from werkzeug.utils import secure_filename
from scanner import scan_ip, load_local_ip_list, get_tor_exit_nodes
from db import  save_scan, get_scan_history, save_url_scan, get_url_scan_history
from url_checker import check_url
from ai_recommender import generate_recommendation
from scan_img import predict_image
from auth import auth_bp
from auth.models import db, bcrypt  
import logging
from blog.routes import blog_bp
from flask import render_template, session
from flask_appbuilder import AppBuilder, IndexView
from flask_appbuilder.security.sqla.manager import SecurityManager
from auth.models import User as CustomUser, db as custom_db
from flask_appbuilder.security.views import AuthDBView
from auth.utils import init_mail
import csv
import io
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from auth.models import db
from history.models import IPScanHistory, URLScanHistory, ReportedURL
from file_hash_checker import calculate_hashes  
import requests, hashlib
from flask import request, jsonify
from flask_login import login_required
import integrity_db


def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]
        
class CustomSecurityManager(SecurityManager):
    def add_user(self, *args, **kwargs):

        ab_user = super().add_user(*args, **kwargs)

        if not custom_db.session.query(CustomUser).filter_by(email=ab_user.email).first():
            custom_user = CustomUser(
                email=ab_user.email,

                name=f"{ab_user.first_name or ''} {ab_user.last_name or ''}".strip(),
                provider='local',
                password_hash=ab_user.password,  
                is_admin=True,
                email_verified=True
            )
            custom_db.session.add(custom_user)
            custom_db.session.commit()

        return ab_user



class AdminIndexView(IndexView):
    route_base = '/admin'
    index_title = 'Admin Dashboard'


def create_app():

    app = Flask(__name__,
                static_folder='static',
                template_folder='templates')
    os.makedirs(app.instance_path, exist_ok=True)
    # point the checker at instance/scan_history.db
    import integrity_db
    integrity_db.DB_NAME = os.path.join(app.instance_path, 'scan_history.db')
    # delete any old corrupt DB so we start fresh
    try:
        os.remove(integrity_db.DB_NAME)
    except FileNotFoundError:
        pass
    # (re)create the scans table with the correct schema
    integrity_db.init_db()
    app.secret_key = os.getenv("SECRET_KEY")
    app.url_map.strict_slashes = False

    app.config['LOCAL_IP_FILE'] = 'ip_hist.csv'

    app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'uploads')
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.config['ALLOWED_EXTENSIONS'] = {'png','jpg','jpeg'}
    app.config['BULK_WORKERS'] = 5  
    app.config['FAB_ALLOWED_FILE_EXTENSIONS'] = ['png','jpg','jpeg']
    app.config['INTEGRITY_ALLOWED_EXTENSIONS'] = {
        'exe', 'zip', 'pdf', 'png', 'jpg', 'jpeg', 'gif'
    }
    app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024

    
    app.config.setdefault('BULK_WORKERS', 5)

    app.config.update(
        SESSION_COOKIE_SECURE=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
    )

    app.config.update({
        'MAIL_SERVER': 'smtp.gmail.com',
        'MAIL_PORT': 587,
        'MAIL_USE_TLS': True,
        'MAIL_USERNAME': os.getenv("MAIL_USERNAME"),
        'MAIL_PASSWORD': os.getenv("MAIL_PASSWORD"),
        'MAIL_DEFAULT_SENDER': os.getenv("MAIL_DEFAULT_SENDER"),
    })
    init_mail(app)
    
    db_path = os.path.join(app.instance_path, 'appdata.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'USERS_DATABASE_URL',
        f'sqlite:///{db_path}'
    )

    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    app.config['FAB_RBAC'] = True
    app.config['FAB_MANAGE_USER_REGISTRATION'] = False
    app.config['FAB_UPLOAD_FOLDER'] = os.path.join(app.root_path, 'static', 'uploads')
    app.config['FAB_ALLOWED_FILE_EXTENSIONS'] = ['jpg', 'png', 'gif', 'md']

    from flask_migrate import Migrate
    
    from admin_views import init_admin_views

    db.init_app(app)
    bcrypt.init_app(app)
    import blog.models
    import history.models

    Migrate(app, db)




    with app.app_context():
        app.config['FAB_CREATE_DB'] = False
        appbuilder = AppBuilder(
            app,
            db.session,
            indexview=AdminIndexView,
            security_manager_class=CustomSecurityManager,
        )

        init_admin_views(appbuilder)
        fab_bp = app.blueprints.pop('appbuilder')
        app.register_blueprint(fab_bp, url_prefix='/admin')
        api_bp = app.blueprints.pop('appbuilder_api', None)
        if api_bp:
            app.register_blueprint(api_bp, url_prefix='/admin/api')

    app.register_blueprint(auth_bp)
    app.register_blueprint(blog_bp)

    def allowed_file(filename: str) -> bool:
        if '.' not in filename:
            return False
        return filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']
    
    @app.errorhandler(404)
    def not_found(e):
        return render_template('404.html'), 404

    @app.route('/', methods=['GET'])
    def index():
        return render_template('home.html', user=session.get('user'))

    @app.route('/features', methods=['GET'])
    def features():
        return render_template('features.html', user=session.get('user'))
    
    @app.route('/scanner', methods=['GET'])
    @login_required   
    def scanner_view():
        return render_template('scanner.html')
        
    @app.route('/api/scan', methods=['POST'])
    @login_required
    def scan():
     
        raw_ips = []
        if 'file' in request.files:
     
            csv_text = request.files['file'].stream.read().decode(errors='ignore')
            for row in csv.reader(io.StringIO(csv_text)):
                raw_ips += [cell.strip() for cell in row if cell.strip()]
        else:

            data = request.get_json(silent=True) or {}
            single = data.get('ip')
            multi  = data.get('ips')
            if single:
                raw_ips = [single.strip()]
            elif multi:
                if isinstance(multi, list):
                    raw_ips = multi
                else:  
                    raw_ips = [p.strip() for p in str(multi).replace('\n',',').split(',') if p.strip()]

        if not raw_ips:
            return jsonify({"error": "No IP(s) provided"}), 400

        ips = list(dict.fromkeys(raw_ips))

        try:
            tor_nodes    = get_tor_exit_nodes()
            local_ip_set = load_local_ip_list(app.config['LOCAL_IP_FILE'])
        except Exception as e:
            logging.warning("Could not load IP lists: %s", e)
            tor_nodes, local_ip_set = set(), set()

        results = []
        workers = app.config['BULK_WORKERS']
        with ThreadPoolExecutor(max_workers=workers) as exe:
            future_map = {exe.submit(scan_ip, ip, tor_nodes, local_ip_set): ip for ip in ips}
            for fut in as_completed(future_map):
                ip = future_map[fut]
                try:
                    prof = fut.result()
                    prof.recommendation = generate_recommendation(prof.__dict__)
                    save_scan(ip, prof.__dict__)
                    user = session.get('user', {})
                    user_id = user.get('id')
                    entry = IPScanHistory(
                        user_id     = user_id,
                        ip          = ip,
                        profile     = json.dumps(prof.__dict__),
                        abuse_risk  = prof.abuse_risk
                    )
                    db.session.add(entry)
                    db.session.commit()
                    results.append({"ip": ip, "result": prof.__dict__})
                except Exception as e:
                    logging.exception("Error scanning %s", ip)
                    results.append({"ip": ip, "error": str(e)})

        return jsonify({"results": results})

    @app.route('/api/history', methods=['GET'])
    def history():
        try:
            return jsonify(get_scan_history())
        except Exception:
            logging.exception("Error fetching IP history")
            return jsonify({"error": "Could not load history"}), 500

    @app.route('/api/report-url', methods=['POST'])
    @login_required
    def report_url():
        payload = request.get_json() or {}
        url   = payload.get("url")
        label = payload.get("label", "")
        if not url:
            return jsonify({"error":"Missing URL"}), 400

        user = session.get('user', {})
        user_id = user.get('id')
        report = ReportedURL(
            user_id = user_id,
            url     = url,
            label   = label
        )

        db.session.add(report)
        db.session.commit()
        return jsonify({"message":"URL reported successfully"}), 201

    @app.route('/api/report-ip', methods=['POST'])
    @login_required
    def report_ip():
        payload = request.get_json() or {}
        ip = payload.get("ip")
        if not ip:
            return jsonify({"error": "Missing IP"}), 400

        user = session.get('user', {})
        user_id = user.get('id')
        if not user_id:
            return jsonify({"error": "Not authenticated"}), 401

        report = ReportedURL(
            user_id=user_id,
            url=ip,
            label=""  
        )
        db.session.add(report)
        db.session.commit()
        return jsonify({"message": "IP reported successfully"}), 201






    @app.route('/api/scan-url', methods=['POST'])
    @login_required
    def scan_url():
        items = []
        if request.files.get('file'):
            text = request.files['file'].stream.read().decode()
            for row in csv.reader(io.StringIO(text)):
                items += [u.strip() for u in row if u.strip()]
        else:
            data = request.get_json(silent=True) or {}
            raw = data.get('url') or data.get('urls')
            if isinstance(raw, str):
                items = [x.strip() for x in raw.replace('\n', ',').split(',') if x.strip()]
            elif isinstance(raw, list):
                items = raw
            else:
                return jsonify({"error": "No URL provided"}), 400

        urls = list(dict.fromkeys(items))
        if not urls:
            return jsonify({"error": "Empty URL list"}), 400

        results = []
        workers = app.config.get('BULK_WORKERS', 5)
        with ThreadPoolExecutor(max_workers=workers) as exe:
            for batch in chunked(urls, workers):
                futures = {exe.submit(check_url, url): url for url in batch}
                for fut in as_completed(futures):
                    url = futures[fut]
                    try:
                        res = fut.result()
                        res["recommendation"] = generate_recommendation(res)
                        save_url_scan(url, res)
                        user = session.get('user', {})
                        user_id = user.get('id')
                        entry = URLScanHistory(
                            user_id = user_id,
                            url     = url,
                            data    = json.dumps(res)
                        )

                        db.session.add(entry)
                        db.session.commit()
                        results.append({"url": url, "result": res})
                    except Exception as e:
                        results.append({"url": url, "error": str(e)})
        return jsonify({"results": results})
    
    @app.route('/integrity', methods=['GET','POST'])
    @login_required
    def integrity():
        error = None; hashes = None; filename = None; match_result = None
        vt_summary = vt_verdict = vt_url = ''; status = 'unknown'
        allowed = app.config.get('FAB_ALLOWED_FILE_EXTENSIONS', ['exe','zip','pdf','jpg','png'])
        if request.method=='POST':
            f = request.files.get('file')
            ref = request.form.get('refhash','').strip().lower()
            if not f or f.filename=='':
                error = "❌ No file selected."
            elif f.filename.rsplit('.',1)[-1].lower() not in allowed:
                error = f"❌ Unsupported type. Allowed: {', '.join(allowed)}"
            else:
                filename = secure_filename(f.filename)
                hashes = calculate_hashes(f.stream)            # :contentReference[oaicite:4]{index=4}:contentReference[oaicite:5]{index=5}
                sha256 = hashes['SHA256']
                if ref:
                    match_result = ("✅ Match — intact." 
                                    if ref==sha256 
                                    else "❌ Mismatch — file modified.")
                status, vt_summary, vt_verdict, vt_url = check_virustotal(sha256)
                save_scan(filename, sha256, status, hashes, vt_summary, vt_verdict, vt_url)  # :contentReference[oaicite:6]{index=6}:contentReference[oaicite:7]{index=7}
        return render_template('integrity_index.html',
                            error=error, hashes=hashes, filename=filename,
                            status=status, vt_summary=vt_summary,
                            vt_verdict=vt_verdict, vt_url=vt_url,
                            allowed=allowed, match_result=match_result)

    @app.route('/integrity/history', methods=['GET'])
    @login_required
    def integrity_history():
        sort_by   = request.args.get('sort','time')
        filter_dt = request.args.get('date')
        scans     = integrity_db.get_filtered_scans(sort_by, filter_dt)     # :contentReference[oaicite:8]{index=8}:contentReference[oaicite:9]{index=9}
        return render_template('integrity_history.html',
                            scans=scans, sort_by=sort_by, filter_date=filter_dt)

    @app.route('/integrity/delete/<int:scan_id>', methods=['POST'])
    @login_required
    def integrity_delete(scan_id):
        integrity_db.delete_scan(scan_id)                                   # :contentReference[oaicite:10]{index=10}:contentReference[oaicite:11]{index=11}
        return redirect(url_for('integrity_history'))

    @app.route('/integrity/delete_all', methods=['POST'])
    @login_required
    def integrity_delete_all():
        integrity_db.delete_all_scans()                                     # :contentReference[oaicite:12]{index=12}:contentReference[oaicite:13]{index=13}
        return redirect(url_for('integrity_history'))



    @app.route("/api/url-history", methods=["GET"])
    def url_history():
        try:
            return jsonify(get_url_scan_history())
        except Exception as e:
            logging.exception("Error fetching URL history")
            return jsonify({"error": f"Failed to fetch URL history: {str(e)}"}), 500

    @app.route('/api/scan-image', methods=['POST'])
    def scan_image():
      
        files = request.files.getlist('file')
        if not files:
            return jsonify({"error": "No image provided"}), 400

        results = []
        workers = current_app.config.get('BULK_WORKERS', 5)
        allowed = current_app.config.get('ALLOWED_EXTENSIONS', {'png','jpg','jpeg'})
        upload_dir = current_app.config['UPLOAD_FOLDER']

        with ThreadPoolExecutor(max_workers=workers) as exe:
            for batch in chunked(files, workers):
                futures = {}
                for file in batch:
                    name = secure_filename(file.filename)
                    ext  = name.rsplit('.', 1)[-1].lower()

                    if ext not in allowed:
                        results.append({
                            "file": name,
                            "error": f"Unsupported file type: .{ext}"
                        })
                        continue

                    path = os.path.join(upload_dir, name)
                    file.save(path)

                    futures[exe.submit(predict_image, path)] = (name, path)

                for fut in as_completed(futures):
                    name, path = futures[fut]
                    try:
                        label, conf = fut.result()
                        results.append({
                            "file": name,
                            "label": label,
                            "confidence": round(conf, 2)
                        })
                    except Exception as e:
                        results.append({
                            "file": name,
                            "error": f"Unable to process image: {str(e)}"
                        })
                    finally:
                
                        if os.path.exists(path):
                            os.remove(path)

        return jsonify({"results": results})
   


    VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")
    def check_virustotal(sha256):
        url = f"https://www.virustotal.com/api/v3/files/{sha256}"
        headers = {"x-apikey": VIRUSTOTAL_API_KEY}
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json().get('data', {}).get('attributes', {}).get('last_analysis_stats', {})
            report_url = f"https://www.virustotal.com/gui/file/{sha256}/detection"
            m, s, h, u = data.get('malicious',0), data.get('suspicious',0), data.get('harmless',0), data.get('undetected',0)
            summary = f"🧪 VT — Malicious: {m}, Suspicious: {s}, Harmless: {h}, Undetected: {u}"
            if m>5:
                return "malicious", summary, "❌ File is malicious or tampered.", report_url
            if s>0:
                return "unknown", summary, "⚠️ File is suspicious.", report_url
            if h>0 and m==0:
                return "safe", summary, "✅ File is clean and untampered.", report_url
        return "unknown", "⚠️ No analysis.", "⚠️ Unable to get VT result.", ""


    @app.route('/api/integrity', methods=['POST'])
    @login_required
    def api_integrity_check():
        # 1) Allowed extensions from config
        allowed = current_app.config['INTEGRITY_ALLOWED_EXTENSIONS']

        # 2) Grab file & optional reference hash
        uploaded = request.files.get('file')
        ref_hash = (request.form.get('refhash') or '').strip().lower()

        # 3) Validate presence
        if not uploaded or not uploaded.filename:
            return jsonify(error="❌ No file selected."), 400

        # 4) Validate extension
        ext = uploaded.filename.rsplit('.', 1)[-1].lower()
        if ext not in allowed:
            return jsonify(
                error=f"❌ Unsupported type (. {ext}). Allowed: {', '.join(sorted(allowed))}"
            ), 400

        # 5) Compute all hashes
        try:
            hashes = calculate_hashes(uploaded.stream)
        except Exception as e:
            return jsonify(error=f"❌ Hashing failed: {e}"), 500

        sha256 = hashes.get('SHA256')
        # 6) Optional integrity check
        match_result = None
        if ref_hash:
            match_result = (
                "✅ Match — file intact."
                if ref_hash == sha256
                else "❌ Mismatch — file modified."
            )

        # 7) VirusTotal lookup (falls back gracefully)
        try:
            status, vt_summary, vt_verdict, vt_url = check_virustotal(sha256)
        except Exception:
            status, vt_summary, vt_verdict, vt_url = (
                "unknown",
                "⚠️ VT lookup failed.",
                "⚠️ Unable to contact VT.",
                ""
            )

        # 8) Persist safely
        try:
            integrity_db.save_scan(
                secure_filename(uploaded.filename),
                sha256, status, hashes,
                vt_summary, vt_verdict, vt_url
            )
        except Exception as e:
            # log and continue; user still gets JSON back
            app.logger.error("Integrity DB save failed: %s", e)

        # 9) Return JSON
        return jsonify({
            "filename": secure_filename(uploaded.filename),
            "hashes": hashes,
            "match_result": match_result,
            "status": status,
            "vt_summary": vt_summary,
            "vt_verdict": vt_verdict,
            "vt_url": vt_url
        }), 200
    
    
    return app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    create_app().run(host="0.0.0.0", port=port, debug=True)
