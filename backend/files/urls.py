from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FileViewSet

router = DefaultRouter()
router.register(r'files', FileViewSet)

# The DefaultRouter automatically creates URLs for all actions:
# - GET/POST/PUT/DELETE /files/
# - GET/PUT/DELETE /files/{id}/
# - GET /files/stats/ (from @action decorator)
# - GET /files/file_types/ (from @action decorator)

urlpatterns = [
    path('', include(router.urls)),
]
