from flask import Blueprint

# Initialize Blueprint for blog
blog_bp = Blueprint(
    'blog',
    __name__,
    template_folder='templates/blog',
    url_prefix='/blog'
)

# Import routes and views to register them
from . import routes, views