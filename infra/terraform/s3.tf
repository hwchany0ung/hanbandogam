resource "aws_s3_bucket" "hanbando_images" {
  bucket = "${var.project_name}-images-${var.s3_bucket_suffix}"

  tags = {
    Name    = "${var.project_name}-images"
    Project = var.project_name
  }
}

resource "aws_s3_bucket_public_access_block" "hanbando_images" {
  bucket = aws_s3_bucket.hanbando_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "hanbando_images" {
  bucket = aws_s3_bucket.hanbando_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "GET"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}
