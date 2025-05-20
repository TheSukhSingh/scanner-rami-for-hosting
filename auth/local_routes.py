from flask import (
    render_template, redirect, url_for,
    request, flash
)
from .utils import (
    generate_confirmation_token,
    confirm_token,
    send_email,
    login_user
)
from . import auth_bp
from .models import db, User
from .oauth_routes import GOOGLE_CLIENT_ID

@auth_bp.route('/signup', methods=['GET', 'POST'])
@auth_bp.route('/signup/', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        name     = request.form.get('name', '').strip()
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm  = request.form.get('confirm_password', '')

        # Basic validation
        if not all([name, email, password, confirm]):
            flash('All fields are required.', 'warning')
            return redirect(url_for('auth.signup'))
        if password != confirm:
            flash('Passwords do not match.', 'warning')
            return redirect(url_for('auth.signup'))
        existing = User.query.filter_by(email=email).first()
        if existing:
            if existing.provider != 'local':
                flash(
                    f"This email is already registered via {existing.provider}. Please sign in with that.",
                    'warning'
                )
            else:
                flash('Email is already registered.', 'warning')
            return redirect(url_for('auth.signup'))


        # Create and persist new user
        user = User(email=email, name=name, provider='local')
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        # Send email confirmation link
        token       = generate_confirmation_token(user.email)
        confirm_url = url_for('auth.confirm_email', token=token, _external=True)
        html        = render_template('auth/activate.html', confirm_url=confirm_url)
        send_email(user.email, 'Please confirm your email', html)

        flash('Signup successful! Check your email to confirm your account.', 'success')
        return redirect(url_for('auth.login_page'))

    return render_template(
        'auth/signup.html'
    )


@auth_bp.route('/confirm/<token>')
def confirm_email(token):
    try:
        email = confirm_token(token)
    except:
        flash('The confirmation link is invalid or has expired.', 'danger')
        return redirect(url_for('index'))

    user = User.query.filter_by(email=email).first_or_404()
    if not user:
        flash('Account not found.', 'danger')
        return redirect(url_for('auth.signup'))
    if user.email_verified:
        flash('Account already confirmed. Please log in.', 'info')
    else:
        user.email_verified = True
        db.session.commit()
        flash('Your account has been confirmed!', 'success')
    return redirect(url_for('index'))

@auth_bp.route('/signin',  methods=['POST'])
@auth_bp.route('/signin/', methods=['POST'], strict_slashes=False)
def login_local():
    email    = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')

    user = User.query.filter_by(email=email, provider='local').first()
    if not user:
        flash('Email not found.', 'danger')
        return redirect(url_for('auth.login_page'))
    if user.is_blocked:
        flash('Your account is blocked. Contact admin.', 'danger')
        return redirect(url_for('auth.login_page'))
    if not user.email_verified:
        flash('Please verify your email before logging in.', 'warning')
        return redirect(url_for('auth.login_page'))

    if user.check_password(password):
        login_user(user)
        flash('Logged in successfully.', 'success')
        return redirect(url_for('index'))
    else:
        user.failed_logins += 1
        db.session.commit()
        flash('Incorrect password.', 'danger')
        return redirect(url_for('auth.login_page'))

@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        user  = User.query.filter_by(email=email, provider='local').first()
        if user:
            # Generate and email reset token
            token     = user.generate_reset_token(expires_in=3600)
            reset_url = url_for('auth.reset_password', token=token, _external=True)
            html      = render_template('auth/reset_password_email.html', reset_url=reset_url)
            send_email(user.email, 'Password Reset Request', html)
        # Always show this message to avoid enumeration
        flash('If that email exists, a reset link has been sent.', 'info')
        return redirect(url_for('auth.login_page'))
    return render_template('auth/forgot.html')

@auth_bp.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    user = User.verify_reset_token(token)
    if not user:
        flash('The reset password link is invalid or has expired.', 'danger')
        return redirect(url_for('auth.forgot_password'))

    if request.method == 'POST':
        password = request.form.get('password', '')
        confirm  = request.form.get('confirm_password', '')
        if not password or password != confirm:
            flash('Passwords must match.', 'warning')
            return redirect(url_for('auth.reset_password', token=token))

        user.set_password(password)
        user.reset_token        = None
        user.reset_token_expiry = None
        db.session.commit()

        flash('Your password has been updated! Please log in.', 'success')
        return redirect(url_for('auth.login_page'))

    return render_template('auth/reset_password.html', token=token)
