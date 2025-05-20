from flask import (
    Blueprint, render_template, request,
    redirect, url_for, flash, abort, jsonify
)
from flask_login import login_required, current_user
from .models import db, BlogPost, Comment, Like

blog_bp = Blueprint(
    'blog',
    __name__,
    template_folder='templates/blog',
    url_prefix='/blog'
)

def _safe_commit(error_message='Database error, please try again.'):
    """Commit or rollback + 500 on failure."""
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        flash(error_message, 'danger')
        abort(500)

#––– LIST POSTS –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

from flask import request

@blog_bp.route('/', methods=['GET'])
def list_posts():
    # 1) Get current page from querystring (default to 1)
    page = request.args.get('page', 1, type=int)
    per_page = 10  # or whatever page size you prefer

    # 2) Build a Pagination object
    pagination = BlogPost.query \
        .order_by(BlogPost.created_at.desc()) \
        .paginate(page=page, per_page=per_page, error_out=False)

    # 3) Extract just the items for this page
    posts = pagination.items

    # 4) Pass both posts *and* pagination to the template
    return render_template(
        'blog/list.html',
        posts=posts,
        pagination=pagination
    )



#––– VIEW & COMMENT ON A POST ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

@blog_bp.route('/<slug>', methods=['GET', 'POST'])
def view_post(slug):
    post = BlogPost.query.filter_by(slug=slug).first_or_404()

    # Handle new comment submission
    if request.method == 'POST':
        if not current_user.is_authenticated:
            flash('Login required to comment.', 'warning')
            return redirect(url_for('auth.login'))

        content = request.form.get('content', '').strip()
        if not content:
            flash('Comment cannot be empty.', 'warning')
            return redirect(url_for('.view_post', slug=slug))

        comment = Comment(post_id=post.id, user_id=current_user.id, content=content)
        db.session.add(comment)
        post.comments_count += 1
        _safe_commit('Failed to post comment.')
        flash('Comment added.', 'success')
        return redirect(url_for('.view_post', slug=slug))

    # Check if current user already liked
    liked = False
    if current_user.is_authenticated:
        liked = bool(Like.query.filter_by(post_id=post.id, user_id=current_user.id).first())

    return render_template('blog/detail.html', post=post, liked=liked)


#––– CREATE A NEW POST (ADMIN ONLY) ––––––––––––––––––––––––––––––––––––––––––––––––––––

@blog_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create_post():
    if not getattr(current_user, 'is_admin', False):
        abort(403)

    if request.method == 'POST':
        title          = request.form.get('title', '').strip()
        content        = request.form.get('content', '').strip()
        content_format = request.form.get('content_format', 'markdown')
        excerpt        = request.form.get('excerpt', '').strip()

        if not title or not content:
            flash('Title and content are required.', 'warning')
            return render_template('blog/form.html', post=None)

        post = BlogPost(
            title=title,
            content=content,
            content_format=content_format,
            excerpt=excerpt,
            author_id=current_user.id
        )
        db.session.add(post)
        _safe_commit('Failed to create post.')
        flash('Post created successfully.', 'success')
        return redirect(url_for('.view_post', slug=post.slug))

    return render_template('blog/form.html', post=None)


#––– EDIT AN EXISTING POST (ADMIN ONLY) –––––––––––––––––––––––––––––––––––––––––––––––––

@blog_bp.route('/<int:post_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_post(post_id):
    post = BlogPost.query.get_or_404(post_id)
    if not getattr(current_user, 'is_admin', False):
        abort(403)

    if request.method == 'POST':
        post.title          = request.form.get('title', post.title).strip()
        post.content        = request.form.get('content', post.content).strip()
        post.content_format = request.form.get('content_format', post.content_format)
        post.excerpt        = request.form.get('excerpt', post.excerpt).strip()

        _safe_commit('Failed to update post.')
        flash('Post updated.', 'success')
        return redirect(url_for('.view_post', slug=post.slug))

    return render_template('blog/form.html', post=post)


#––– DELETE A POST (ADMIN ONLY) ––––––––––––––––––––––––––––––––––––––––––––––––––––––––

@blog_bp.route('/<int:post_id>/delete', methods=['POST'])
@login_required
def delete_post(post_id):
    post = BlogPost.query.get_or_404(post_id)
    if not getattr(current_user, 'is_admin', False):
        abort(403)

    db.session.delete(post)
    _safe_commit('Failed to delete post.')
    flash('Post deleted.', 'success')
    return redirect(url_for('.list_posts'))


#––– TOGGLE LIKE (USERS ONLY) –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

@blog_bp.route('/<int:post_id>/like', methods=['POST'])
@login_required
def toggle_like(post_id):
    post = BlogPost.query.get_or_404(post_id)
    existing = Like.query.filter_by(post_id=post.id, user_id=current_user.id).first()

    if existing:
        db.session.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        action = 'unliked'
    else:
        db.session.add(Like(post_id=post.id, user_id=current_user.id))
        post.likes_count += 1
        action = 'liked'

    _safe_commit('Failed to update like.')

    if request.is_json:
        return jsonify({
            'status': 'success',
            'action': action,
            'likes_count': post.likes_count
        })

    flash(f'You have {action} this post.', 'info')
    return redirect(request.referrer or url_for('.view_post', slug=post.slug))
