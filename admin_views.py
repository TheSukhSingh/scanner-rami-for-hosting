from flask_appbuilder import ModelView
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_login import current_user
from flask import redirect, url_for, g
from auth.models import User
from history.models import IPScanHistory, URLScanHistory, ReportedURL
from datetime import datetime

def init_admin_views(appbuilder):
    """
    Register admin views after AppBuilder is initialized.
    """
    class SecuredModelView(ModelView):
        def is_accessible(self):
            return current_user.is_authenticated and current_user.is_admin

        def inaccessible_callback(self, name, **kwargs):
            return redirect(url_for("AuthDBView.login"))

    class UserModelView(SecuredModelView):
        datamodel = SQLAInterface(User)
        list_columns = ["id", "email", "is_admin"]
        show_columns = list_columns
        add_columns  = ["email", "is_admin"]
        edit_columns = ["email", "is_admin"]

    class IPScanHistoryView(SecuredModelView):
        datamodel     = SQLAInterface(IPScanHistory)
        list_columns = ["id", "user_id", "ip", "abuse_risk", "scanned_at"]

    class URLScanHistoryView(SecuredModelView):
        datamodel     = SQLAInterface(URLScanHistory)
        list_columns = ["id", "user_id", "url", "scanned_at"]

    class ReportedURLView(SecuredModelView):
        datamodel = SQLAInterface(ReportedURL)

        # Show these in the list and show pages:
        list_columns = [
            "id", "user", "url", "label",
            "reported_at", "approved", "approved_by", "approved_at"
        ]
        show_columns = list_columns

        # Only let admins supply URL & label on add:
        add_columns = ["url", "label"]
        # Only let admins flip the approved checkbox on edit:
        edit_columns = ["approved"]

        # Keep the grid sorted by newest first
        base_order = ("reported_at", "desc")

        def on_model_change(self, form, model, is_created):
            """
            Called just before INSERT or UPDATE.
            """
            if is_created:
                # stamp who reported and when
                model.user = g.user                # AppBuilder's current user
                model.reported_at = datetime.utcnow()

            # If an admin just flipped `approved` on, and `approved_at` is empty:
            if model.approved and not model.approved_at:
                model.approved_by = g.user
                model.approved_at  = datetime.utcnow()

    appbuilder.add_view(UserModelView, "Users", icon="fa-user", category="Admin")
    appbuilder.add_view(IPScanHistoryView, "IP History", category="Admin")
    appbuilder.add_view(URLScanHistoryView, "URL History", category="Admin")
    appbuilder.add_view(ReportedURLView, "Reported URLs", category="Admin")
