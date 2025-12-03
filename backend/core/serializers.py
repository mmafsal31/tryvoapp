from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
import json

from .models import (
    Store,
    Product,
    ProductSize,
    ProductImage,
    Reservation,
    Sale,
    CustomerCredit,
    Return,
    Advertisement,
    Staff,
    Attendance,
    SalaryRecord,
    BuyNowOrder,
)

User = get_user_model()

# ======================================================
# 🔐 USER REGISTRATION SERIALIZER
# ======================================================
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("username", "email", "phone", "place_text", "password", "password2")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ======================================================
# 🏪 STORE SERIALIZER
# ======================================================
class StoreSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    logo = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Store
        fields = [
            "id",
            "store_name",
            "place",
            "phone",
            "category",
            "bio",
            "logo",
            "cover_image",
            "created_at",
            "owner",
        ]

    def get_logo(self, obj):
        request = self.context.get("request")
        if obj.logo and request:
            return request.build_absolute_uri(obj.logo.url)
        return None

    def get_cover_image(self, obj):
        request = self.context.get("request")
        if obj.cover_image and request:
            return request.build_absolute_uri(obj.cover_image.url)
        return None


# ======================================================
# 📏 PRODUCT SIZE
# ======================================================
class ProductSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSize
        fields = ["id", "size_label", "price", "quantity"]


# ======================================================
# 🖼 PRODUCT IMAGE
# ======================================================
class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "image_url"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None


# ======================================================
# 🛍 PRODUCT SERIALIZER (FIXED)
# ======================================================
class ProductSerializer(serializers.ModelSerializer):
    store_id = serializers.IntegerField(source="store.id", read_only=True)
    store_name = serializers.CharField(source="store.store_name", read_only=True)
    sizes = ProductSizeSerializer(many=True, required=False)
    images = ProductImageSerializer(many=True, required=False)
    main_image = serializers.ImageField(required=False, allow_null=True)
    average_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "store_id",
            "store_name",
            "name",
            "category",
            "description",
            "main_image",
            "keywords",
            "average_price",
            "sizes",
            "images",
            "created_at",
        ]

    def get_average_price(self, obj):
        first_size = obj.sizes.first()
        return first_size.price if first_size else None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get("request")

        if request and instance.main_image:
            rep["main_image"] = request.build_absolute_uri(instance.main_image.url)

        return rep

    def create(self, validated_data):
        request = self.context.get("request")
        sizes_data = validated_data.pop("sizes", [])
        images_data = validated_data.pop("images", [])

        # Convert JSON string → dict
        raw_sizes = request.data.get("sizes")
        if isinstance(raw_sizes, str):
            try:
                sizes_data = json.loads(raw_sizes)
            except:
                sizes_data = []

        product = Product.objects.create(**validated_data)

        for size in sizes_data:
            ProductSize.objects.create(product=product, **size)

        for img in images_data:
            ProductImage.objects.create(product=product, **img)

        return product

    def update(self, instance, validated_data):
        request = self.context.get("request")
        sizes_data = validated_data.pop("sizes", [])
        images_data = validated_data.pop("images", [])

        # JSON handling
        raw_sizes = request.data.get("sizes")
        if isinstance(raw_sizes, str):
            try:
                sizes_data = json.loads(raw_sizes)
            except:
                sizes_data = []

        # Update main fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Replace sizes
        if sizes_data:
            instance.sizes.all().delete()
            for size in sizes_data:
                ProductSize.objects.create(product=instance, **size)

        # Replace images
        if images_data:
            instance.images.all().delete()
            for img in images_data:
                ProductImage.objects.create(product=instance, **img)

        return instance


# ======================================================
# 📅 RESERVATION
# ======================================================
class ReservationSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    size = serializers.PrimaryKeyRelatedField(queryset=ProductSize.objects.all())

    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.SerializerMethodField()
    category = serializers.CharField(source="product.category", read_only=True)
    size_label = serializers.CharField(source="size.size_label", read_only=True)
    price = serializers.DecimalField(source="size.price", max_digits=10, decimal_places=2, read_only=True)
    customer_name = serializers.CharField(source="customer.username", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "product",
            "product_name",
            "product_image",
            "category",
            "size",
            "size_label",
            "price",
            "quantity",
            "advance_amount",
            "status",
            "unique_code",
            "reserved_until",
            "created_at",
            "customer_name",
        ]
        read_only_fields = ["unique_code", "status", "customer"]

    def get_product_image(self, obj):
        request = self.context.get("request")
        if obj.product.main_image:
            return request.build_absolute_uri(obj.product.main_image.url)
        return None


# ======================================================
# 💰 SALE
# ======================================================
class SaleSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.store_name", read_only=True)
    category = serializers.CharField(source="store.category", read_only=True)
    place = serializers.CharField(source="store.place", read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "store_name",
            "category",
            "place",
            "products",
            "subtotal",
            "discount",
            "total_amount",
            "invoice_no",
            "customer_name",
            "customer_phone",
            "payment",
            "is_credit",
            "credit_amount",
            "reservation",
            "created_at",
        ]


class CustomerCreditSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.store_name", read_only=True)

    class Meta:
        model = CustomerCredit
        fields = [
            "id",
            "store_name",
            "customer_name",
            "customer_phone",
            "amount",
            "reference_sale",
            "created_at",
        ]


class ReturnSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.store_name", read_only=True)
    processed_by_name = serializers.CharField(source="processed_by.username", read_only=True)

    class Meta:
        model = Return
        fields = [
            "id",
            "store_name",
            "sale_item",
            "reason",
            "invoice_no",
            "processed_by_name",
            "created_at",
        ]


# ======================================================
# 🔑 CUSTOM JWT TOKEN SERIALIZER
# ======================================================
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        request = self.context.get("request")

        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "place_text": user.place_text,
            "is_store": user.is_store,
        }

        if hasattr(user, "store"):
            store = user.store
            user_data["store"] = {
                "id": store.id,
                "store_name": store.store_name,
                "place": store.place,
                "phone": store.phone,
                "category": store.category,
                "logo": request.build_absolute_uri(store.logo.url) if store.logo else None,
                "cover_image": request.build_absolute_uri(store.cover_image.url) if store.cover_image else None,
            }

        data["user"] = user_data
        return data


# ======================================================
# 📢 ADVERTISEMENT SERIALIZER (FIXED)
# ======================================================
class AdvertisementSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()

    class Meta:
        model = Advertisement
        fields = "__all__"

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_video_url(self, obj):
        request = self.context.get("request")
        if obj.video:
            return request.build_absolute_uri(obj.video.url)
        return None


# ======================================================
# POS Reservation
# ======================================================
class ReservationPOSSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    size = ProductSizeSerializer(read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    size_label = serializers.CharField(source="size.size_label", read_only=True)
    price = serializers.DecimalField(source="size.price", max_digits=10, decimal_places=2, read_only=True)
    customer_name = serializers.CharField(source="customer.username", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "unique_code",
            "product",
            "product_name",
            "size",
            "size_label",
            "quantity",
            "price",
            "advance_amount",
            "status",
            "reserved_until",
            "customer_name",
        ]


# ======================================================
# Attendance + Salary
# ======================================================
class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = ["id", "name", "phone", "position", "salary_per_day", "created_at", "updated_at"]


class AttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.ReadOnlyField(source="staff.name")
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Attendance
        fields = [
            "id",
            "staff",
            "staff_name",
            "date",
            "status",
            "notes",
            "override_amount",
            "amount",
            "created_at",
            "updated_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["amount"] = str(instance.compute_amount())
        return data


class SalaryRecordSerializer(serializers.ModelSerializer):
    staff_name = serializers.ReadOnlyField(source="staff.name")

    class Meta:
        model = SalaryRecord
        fields = [
            "id",
            "staff",
            "staff_name",
            "year",
            "month",
            "total_amount",
            "is_paid",
            "notes",
            "computed_at",
        ]
        read_only_fields = ["total_amount", "computed_at"]


# ======================================================
# BUY NOW ORDER
# ======================================================
class BuyNowOrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    size_label = serializers.CharField(source="size.size_label", read_only=True)

    class Meta:
        model = BuyNowOrder
        fields = [
            "id",
            "customer_name",
            "phone",
            "address",
            "pincode",
            "landmark",
            "district",
            "state",
            "country",
            "size",
            "quantity",
            "total_price",
            "product_name",
            "size_label",
            "created_at",
        ]
