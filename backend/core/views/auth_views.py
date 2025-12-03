# core/views/auth_views.py

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model

from core.serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
)

User = get_user_model()


# -------------------------------------------------------------------
# REGISTER USER + RETURN JWT TOKENS
# -------------------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    """
    Register a new user and return JWT access + refresh tokens.
    """
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        # Create JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": serializer.data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


# -------------------------------------------------------------------
# LOGIN USER (JWT)
# -------------------------------------------------------------------

class CustomLoginView(TokenObtainPairView):
    """
    Login using JWT (SimpleJWT)
    Returns: access + refresh tokens
    """
    serializer_class = CustomTokenObtainPairSerializer


# -------------------------------------------------------------------
# GET AUTHENTICATED USER INFO
# -------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def get_user_info(request):
    """
    Fetch profile details of the logged-in user.
    """
    serializer = RegisterSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)
