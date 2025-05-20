import uuid
from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

# Initialize these in your app setup (e.g. in app.py):
# db.init_app(app)\# bcrypt.init_app(app)
db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    """
    Represents an application user, supporting local and OAuth logins,
    admin/block flags, and password reset functionality.
    """
    __tablename__ = 'users'

    # Primary key
    id = db.Column(db.Integer, primary_key=True)

    # Basic user info
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)

    # Local auth (bcrypt hash) -- null for OAuth-only accounts
    password_hash = db.Column(db.String(128), nullable=True)

    # OAuth provider info
    provider = db.Column(
        db.Enum('local', 'google', 'github', name='provider_enum'),
        nullable=False,
        default='local'
    )
    provider_id = db.Column(db.String(255), nullable=True)

    # Permissions & status flags
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    is_blocked = db.Column(db.Boolean, default=False, nullable=False)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)

    # Audit timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    last_login_at = db.Column(db.DateTime, nullable=True)

    # Security helpers
    failed_logins = db.Column(db.Integer, default=0, nullable=False)
    reset_token = db.Column(db.String(36), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)
    

    def set_password(self, password: str) -> None:
        """
        Generate a bcrypt hash for the given plaintext password.
        """
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password: str) -> bool:
        """
        Verify a plaintext password against the stored hash.
        """
        if not self.password_hash:
            return False
        return bcrypt.check_password_hash(self.password_hash, password)

    def generate_reset_token(self, expires_in: int = 3600) -> str:
        """
        Create a UUID-based reset token, store it with an expiry, and return it.
        """
        token = str(uuid.uuid4())
        self.reset_token = token
        self.reset_token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
        db.session.add(self)
        db.session.commit()
        return token

    @staticmethod
    def verify_reset_token(token: str) -> 'User | None':
        """
        Look up a user by reset_token and ensure it's still valid.
        """
        user = User.query.filter_by(reset_token=token).first()
        if user and user.reset_token_expiry and user.reset_token_expiry > datetime.utcnow():
            return user
        return None

    def __repr__(self) -> str:
        return f'<User email={self.email!r} id={self.id}>'


from history.models import IPScanHistory, URLScanHistory, ReportedURL

User.ip_scans = db.relationship(
    'IPScanHistory',
    back_populates='user',
    foreign_keys=[IPScanHistory.user_id],
    cascade='all, delete-orphan'
)

User.url_scans = db.relationship(
    'URLScanHistory',
    back_populates='user',
    foreign_keys=[URLScanHistory.user_id],
    cascade='all, delete-orphan'
)

User.reported_urls = db.relationship(
    'ReportedURL',
    back_populates='user',
    foreign_keys=[ReportedURL.user_id],
    cascade='all, delete-orphan'
)