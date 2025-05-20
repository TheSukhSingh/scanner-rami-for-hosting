import os
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask import current_app, session, flash, redirect, url_for
from functools import wraps
from .models import db
from datetime import datetime
from flask_mail import Mail, Message

# Single Mail instance
mail = Mail()

def init_mail(app):
    """Call this in app.py after you create your Flask app."""
    mail.init_app(app)

def generate_confirmation_token(email: str) -> str:
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    salt = current_app.config.get('SECURITY_PASSWORD_SALT', 'email-confirm-salt')
    return serializer.dumps(email, salt=salt)

def confirm_token(token: str, expiration: int = 3600*24) -> str | None:
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    salt = current_app.config.get('SECURITY_PASSWORD_SALT', 'email-confirm-salt')
    try:
        return serializer.loads(token, salt=salt, max_age=expiration)
    except (SignatureExpired, BadSignature):
        return None

def send_email(to: str, subject: str, html_body: str) -> None:
    """
    Sends an email using Flask-Mail. Assumes you have called init_mail(app).
    """
    msg = Message(
        subject,
        recipients=[to],
        html=html_body,
        sender=current_app.config['MAIL_DEFAULT_SENDER']
    )
    mail.send(msg)

def login_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if 'user' not in session:
            flash("Please log in first.", "warning")
            return redirect(url_for('auth.login_page'))
        return view_func(*args, **kwargs)
    return wrapped

def login_user(user):
    # reset brute-force counters & stamp last login
    user.failed_logins = 0
    user.last_login_at = datetime.utcnow()
    db.session.commit()

    # populate session
    session['user'] = {
        'id':       user.id,
        'email':    user.email,
        'name':     user.name,
        'provider': user.provider
    }
