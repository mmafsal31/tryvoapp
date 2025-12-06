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
    StoreCategory,
    StoreSubCategory,
    OfferCategory,
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

    # Make them writable!
    logo = serializers.ImageField(required=False)
    cover_image = serializers.ImageField(required=False)

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

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get("request")

        if instance.logo:
            rep["logo"] = request.build_absolute_uri(instance.logo.url)

        if instance.cover_image:
            rep["cover_image"] = request.build_absolute_uri(instance.cover_image.url)

        return rep

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
# 🛍 PRODUCT SERIALIZER (FULLY FIXED)
# ======================================================
# ======================================================
# 🛍 UPDATED PRODUCT SERIALIZER (FINAL WORKING VERSION)
# ======================================================
class ProductSerializer(serializers.ModelSerializer):

    # Read-only store details
    store_id = serializers.IntegerField(source="store.id", read_only=True)
    store_name = serializers.CharField(source="store.store_name", read_only=True)

    # Read-only category names
    store_category = serializers.CharField(source="store_category.name", read_only=True)
    store_subcategory = serializers.CharField(source="store_subcategory.name", read_only=True)
    offer_category = serializers.CharField(source="offer_category.title", read_only=True)

    # Write-only IDs for assignment
    store_category_id = serializers.PrimaryKeyRelatedField(
        queryset=StoreCategory.objects.all(),
        source="store_category",
        write_only=True,
        required=False,
        allow_null=True,
    )
    store_subcategory_id = serializers.PrimaryKeyRelatedField(
        queryset=StoreSubCategory.objects.all(),
        source="store_subcategory",
        write_only=True,
        required=False,
        allow_null=True,
    )
    offer_category_id = serializers.PrimaryKeyRelatedField(
        queryset=OfferCategory.objects.all(),
        source="offer_category",
        write_only=True,
        required=False,
        allow_null=True,
    )

    sizes = ProductSizeSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)

    main_image = serializers.ImageField(required=False)

    average_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "store_id",
            "store_name",

            # Read category labels
            "store_category",
            "store_subcategory",
            "offer_category",

            # Write category IDs
            "store_category_id",
            "store_subcategory_id",
            "offer_category_id",

            # Product info
            "name",
            "description",
            "main_image",
            "keywords",

            # Pricing & stock
            "average_price",
            "sizes",
            "images",

            "created_at",
        ]

    # ----------------------------------------------------
    # GET FIRST SIZE PRICE
    # ----------------------------------------------------
    def get_average_price(self, obj):
        first = obj.sizes.first()
        return first.price if first else None

    # ----------------------------------------------------
    # CREATE PRODUCT (FormData + JSON sizes + images)
    # ----------------------------------------------------
    def create(self, validated_data):
        request = self.context["request"]

        # Extract sizes JSON coming from FormData
        sizes_json = request.data.get("sizes")
        sizes = json.loads(sizes_json) if sizes_json else []

        # Create Product
        product = Product.objects.create(**validated_data)

        # ---- SAVE SIZES ----
        for size in sizes:
            ProductSize.objects.create(
                product=product,
                size_label=size["size_label"],
                price=size["price"],
                quantity=size["quantity"],
            )

        # ---- SAVE GALLERY IMAGES ----
        for img in request.FILES.getlist("images"):
            ProductImage.objects.create(product=product, image=img)

        return product

    # ----------------------------------------------------
    # UPDATE PRODUCT
    # ----------------------------------------------------
    def update(self, instance, validated_data):
        request = self.context["request"]

        # Update basic fields
        for field in ["name", "description", "keywords",
                      "store_category", "store_subcategory", "offer_category"]:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        # Replace main image if uploaded
        if "main_image" in request.FILES:
            instance.main_image = request.FILES["main_image"]

        instance.save()

        # ---- UPDATE SIZES ----
        sizes_json = request.data.get("sizes")
        sizes = json.loads(sizes_json) if sizes_json else []

        # Delete old sizes
        ProductSize.objects.filter(product=instance).delete()

        # Insert new sizes
        for size in sizes:
            ProductSize.objects.create(
                product=instance,
                size_label=size["size_label"],
                price=size["price"],
                quantity=size["quantity"],
            )

        # ---- APPEND NEW IMAGES ----
        for img in request.FILES.getlist("images"):
            ProductImage.objects.create(product=instance, image=img)

        return instance

    # ----------------------------------------------------
    # FULL URL FOR main_image
    # ----------------------------------------------------
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get("request")

        if instance.main_image:
            rep["main_image"] = request.build_absolute_uri(instance.main_image.url)

        return rep


    # -------------------------------------------------
    # Return full URL for main_image
    # -------------------------------------------------
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get("request")

        if instance.main_image:
            rep["main_image"] = request.build_absolute_uri(instance.main_image.url)

        return rep


class StoreCategorySerializer(serializers.ModelSerializer):
    dp_image = serializers.ImageField(required=False)

    class Meta:
        model = StoreCategory
        fields = ["id", "name", "dp_image", "created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")

        if instance.dp_image:
            data["dp_image"] = request.build_absolute_uri(instance.dp_image.url)

        return data

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["store"] = request.user.store
        return super().create(validated_data)


class StoreSubCategorySerializer(serializers.ModelSerializer):
    dp_image_url = serializers.SerializerMethodField()

    class Meta:
        model = StoreSubCategory
        fields = ["id", "category", "name", "dp_image", "dp_image_url"]
        extra_kwargs = {
            "category": {"required": False},
        }

    def create(self, validated_data):
        request = self.context.get("request")

        category_id = request.data.get("category")
        if not category_id:
            raise serializers.ValidationError({"category": "Category ID required"})

        try:
            category = StoreCategory.objects.get(id=category_id, store=request.user.store)
        except StoreCategory.DoesNotExist:
            raise serializers.ValidationError({"category": "Invalid category"})

        validated_data["category"] = category
        return StoreSubCategory.objects.create(**validated_data)

    def get_dp_image_url(self, obj):
        request = self.context.get("request")
        if obj.dp_image:
            return request.build_absolute_uri(obj.dp_image.url)
        return None

class OfferCategorySerializer(serializers.ModelSerializer):
    banner_image_url = serializers.SerializerMethodField()

    class Meta:
        model = OfferCategory
        fields = [
            "id",
            "store",
            "title",
            "start_date",
            "end_date",
            "banner_image",
            "banner_image_url",
            "created_at",
        ]
        extra_kwargs = {
            "store": {"required": False},
        }

    def create(self, validated_data):
        """
        The view already attaches store = request.user.store
        So do NOT fetch again using Store.objects.get(owner=...)
        That caused 500 error.
        """
        return OfferCategory.objects.create(**validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)

    def get_banner_image_url(self, obj):
        request = self.context.get("request")
        if obj.banner_image:
            return request.build_absolute_uri(obj.banner_image.url)
        return None


# ======================================================
# 📅 RESERVATION
# ======================================================
class ReservationSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    size = serializers.PrimaryKeyRelatedField(queryset=ProductSize.objects.all())

    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.SerializerMethodField()

    category = serializers.CharField(source="product.store_category.name", read_only=True)
    subcategory = serializers.CharField(source="product.store_subcategory.name", read_only=True)
    offer = serializers.CharField(source="product.offer_category.title", read_only=True)

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
            "subcategory",
            "offer",

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
    product_main_image = serializers.SerializerMethodField()

    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

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
            "total_price",  # MUST BE READ-ONLY
            "product_name",
            "size_label",
            "product_main_image",
            "status",
            "created_at",
        ]

    def get_product_main_image(self, obj):
        request = self.context.get("request")
        if obj.product.main_image:
            return request.build_absolute_uri(obj.product.main_image.url)
        return None
