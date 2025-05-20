from datetime import datetime
from auth.models import db
from sqlalchemy import UniqueConstraint, event
from slugify import slugify

#––– BLOG POST MODEL –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

class BlogPost(db.Model):
    __tablename__ = 'blog_posts'

    id             = db.Column(db.Integer, primary_key=True)
    title          = db.Column(db.String(255), nullable=False)
    slug           = db.Column(db.String(255), nullable=False, unique=True, index=True)
    content        = db.Column(db.Text, nullable=False)
    # Store Markdown by default so you can do code-blocks (```python```) and embeds cleanly
    content_format = db.Column(
        db.String(20),
        nullable=False,
        default='markdown'
    )

    # Optional excerpt/summary shown in listings
    excerpt        = db.Column(db.String(500))
    # Reference to your existing User model
    author_id      = db.Column('author_id', db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    created_at     = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at     = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Denormalized counters for fast queries
    likes_count    = db.Column(db.Integer, default=0, nullable=False)
    comments_count = db.Column(db.Integer, default=0, nullable=False)

    # RELATIONSHIPS
    author   = db.relationship('User', backref=db.backref('posts', lazy='dynamic'))
    comments = db.relationship(
        'Comment',
        backref='post',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )
    likes    = db.relationship(
        'Like',
        backref='post',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )

    #––– SLUG GENERATION & VALIDATION –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    @event.listens_for(db.session, 'before_flush')
    def _generate_slug(session, flush_context, instances):
        for obj in session.new:
            if isinstance(obj, BlogPost):
                base = slugify(obj.title)
                slug = base
                i = 1
                # ensure uniqueness
                while BlogPost.query.filter_by(slug=slug).first():
                    slug = f"{base}-{i}"
                    i += 1
                obj.slug = slug

#––– COMMENT MODEL (flat, no threading) –––––––––––––––––––––––––––––––––––––––––––––––––––––––––

class Comment(db.Model):
    __tablename__ = 'comments'

    id         = db.Column(db.Integer, primary_key=True)
    post_id    = db.Column(db.Integer, db.ForeignKey('blog_posts.id', ondelete='CASCADE'), nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    content    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref('comments', lazy='dynamic'))

#––– LIKE MODEL (one per user per post) –––––––––––––––––––––––––––––––––––––––––––––––––––––––––

class Like(db.Model):
    __tablename__ = 'likes'

    id         = db.Column(db.Integer, primary_key=True)
    post_id    = db.Column(db.Integer, db.ForeignKey('blog_posts.id', ondelete='CASCADE'), nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('post_id', 'user_id', name='unique_post_user_like'),
    )

    user = db.relationship('User', backref=db.backref('likes', lazy='dynamic'))
