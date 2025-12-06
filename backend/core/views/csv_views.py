import csv, zipfile, io
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.files.base import ContentFile
from core.models import Product, ProductImage, ProductSize, StoreCategory, StoreSubCategory, OfferCategory

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_upload_products(request):
    store = request.user.store

    csv_file = request.FILES.get("csv")
    zip_file = request.FILES.get("zip")

    if not csv_file or not zip_file:
        return Response({"error": "CSV and ZIP are required"}, status=400)

    # Read ZIP into memory
    zip_data = zipfile.ZipFile(zip_file)

    created_products = []

    # Read CSV
    decoded_csv = csv_file.read().decode("utf-8").splitlines()
    reader = csv.DictReader(decoded_csv)

    for row in reader:
        name = row["name"]
        description = row.get("description", "")
        keywords = row.get("keywords", "")

        # AUTO-CREATE CATEGORY
        category_name = row["category"]
        category, _ = StoreCategory.objects.get_or_create(
            name=category_name, store=store
        )

        # AUTO-CREATE SUBCATEGORY
        sub_name = row.get("subcategory")
        subcat = None
        if sub_name:
            subcat, _ = StoreSubCategory.objects.get_or_create(
                name=sub_name, category=category
            )

        # AUTO-CREATE OFFER
        offer_title = row.get("offer")
        offer = None
        if offer_title:
            offer, _ = OfferCategory.objects.get_or_create(
                title=offer_title, store=store
            )

        # Create product
        product = Product.objects.create(
            store=store,
            name=name,
            description=description,
            keywords=keywords,
            store_category=category,
            store_subcategory=subcat,
            offer_category=offer,
        )

        # MAIN IMAGE
        main_img_name = row["main_image"]
        if main_img_name in zip_data.namelist():
            product.main_image.save(
                main_img_name,
                ContentFile(zip_data.read(main_img_name)),
                save=True
            )

        # GALLERY IMAGES
        gallery_names = row["gallery_images"].split("|") if row["gallery_images"] else []
        for img_name in gallery_names:
            if img_name.strip() in zip_data.namelist():
                ProductImage.objects.create(
                    product=product,
                    image=ContentFile(zip_data.read(img_name), name=img_name)
                )

        # SIZES
        size_entries = row["sizes"].split("|") if row["sizes"] else []
        for s in size_entries:
            size_label, price, qty = s.split(":")
            ProductSize.objects.create(
                product=product,
                size_label=size_label,
                price=price,
                quantity=qty
            )

        created_products.append(product.name)

    return Response({
        "status": "success",
        "created_count": len(created_products),
        "products": created_products
    })
