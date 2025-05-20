from flask import Blueprint
from .views import (
    list_posts,
    view_post,
    create_post,
    edit_post,
    delete_post,
    toggle_like,
)

blog_bp = Blueprint(
    'blog',
    __name__,
    url_prefix='/blog'
)

# List all posts
blog_bp.add_url_rule(
    '/',
    endpoint='list_posts',
    view_func=list_posts,
    methods=['GET']
)

# Create a new post (admin only)
blog_bp.add_url_rule(
    '/create',
    endpoint='create_post',
    view_func=create_post,
    methods=['GET', 'POST']
)

# View a single post and handle commenting
blog_bp.add_url_rule(
    '/<slug>',
    endpoint='view_post',
    view_func=view_post,
    methods=['GET', 'POST']
)

# Edit an existing post (admin only)
blog_bp.add_url_rule(
    '/<int:post_id>/edit',
    endpoint='edit_post',
    view_func=edit_post,
    methods=['GET', 'POST']
)

# Delete a post (admin only)
blog_bp.add_url_rule(
    '/<int:post_id>/delete',
    endpoint='delete_post',
    view_func=delete_post,
    methods=['POST']
)

# Toggle like/unlike (authenticated users only)
blog_bp.add_url_rule(
    '/<int:post_id>/like',
    endpoint='toggle_like',
    view_func=toggle_like,
    methods=['POST']
)
