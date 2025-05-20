from datetime import datetime
from auth.models import db, User
from sqlalchemy import text
class IPScanHistory(db.Model):
    __tablename__ = 'ip_scan_history'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ip = db.Column(db.String(45), nullable=False)
    profile = db.Column(db.Text, nullable=False)                 # raw JSON blob
    abuse_risk = db.Column(db.String(50), nullable=True)         # denormalized for quick filtering
    scanned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship(User, back_populates='ip_scans')

class URLScanHistory(db.Model):
    __tablename__ = 'url_scan_history'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    url = db.Column(db.String(2083), nullable=False)
    data = db.Column(db.Text, nullable=False)                    # raw JSON blob
    scanned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship(User, back_populates='url_scans')

class ReportedURL(db.Model):
    __tablename__ = 'reported_urls'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    url = db.Column(db.String(2083), nullable=False)
    label = db.Column(db.String(255), nullable=False)            # CSV‐dataset label
    reported_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    approved       = db.Column(db.Boolean, default=False, nullable=False)
    rejected     = db.Column(
        db.Boolean,
        default=False,
        nullable=False,
        server_default=text('0')  \
    )
    approved_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship(User, foreign_keys=[user_id], back_populates='reported_urls')
    approved_by = db.relationship(User, foreign_keys=[approved_by_id])
