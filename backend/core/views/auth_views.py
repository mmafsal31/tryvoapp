from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied


from core.serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,

)

User = get_user_model()

# -------------------------------------------------------------------
# AUTH & REGISTRATION
# -------------------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    """Handles new user registration and JWT token creation."""
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        data = {
            "user": serializer.data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
        return Response(data, status=status.HTTP_201_CREATED)


class CustomLoginView(TokenObtainPairView):
    """JWT login with custom serializer."""
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_user_info(request):
    """Return the authenticated user’s profile data."""
    serializer = RegisterSerializer(request.user)
    return Response(serializer.data)

