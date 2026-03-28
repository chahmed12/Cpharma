"""
apps/core/services/image_service.py
==================================
Service pour le traitement des images de profil.
"""

import io
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile


class ImageProcessingError(Exception):
    """Exception personnalisée pour les erreurs de traitement d'image."""

    pass


ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_SIZE_MB = 5
MAX_DIMENSIONS = (400, 400)
QUALITY = 85


def validate_image_file(value: InMemoryUploadedFile) -> InMemoryUploadedFile:
    """
    Valide et redimensionne une image de profil.

    Args:
        value: Fichier image uploadé

    Returns:
        InMemoryUploadedFile: Image redimensionnée

    Raises:
        ImageProcessingError: Si le fichier est invalide
    """
    if not value:
        return value

    if value.content_type not in ALLOWED_CONTENT_TYPES:
        raise ImageProcessingError(
            f"Format non supporté. Utilisez : {', '.join(ALLOWED_CONTENT_TYPES)}."
        )

    if value.size > MAX_SIZE_MB * 1024 * 1024:
        raise ImageProcessingError(f"L'image ne doit pas dépasser {MAX_SIZE_MB} Mo.")

    return resize_image(value)


def resize_image(value: InMemoryUploadedFile) -> InMemoryUploadedFile:
    """
    Redimensionne l'image en conservant les proportions.

    Args:
        value: Fichier image à redimensionner

    Returns:
        InMemoryUploadedFile: Image redimensionnée
    """
    try:
        img = Image.open(value)

        if img.mode not in ("RGB", "RGBA"):
            if value.content_type == "image/jpeg":
                img = img.convert("RGB")

        img.thumbnail(MAX_DIMENSIONS, Image.Resampling.LANCZOS)

        output = io.BytesIO()
        format_map = {
            "image/jpeg": "JPEG",
            "image/png": "PNG",
            "image/webp": "WEBP",
        }
        img_format = format_map.get(value.content_type, "JPEG")

        img.save(output, format=img_format, quality=QUALITY)
        output.seek(0)

        return InMemoryUploadedFile(
            output,
            "ImageField",
            value.name,
            value.content_type,
            output.getbuffer().nbytes,
            None,
        )

    except Exception as e:
        raise ImageProcessingError(f"Erreur lors du traitement de l'image : {e}")
