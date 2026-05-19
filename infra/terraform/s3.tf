resource "aws_s3_bucket" "hanbando_images" {
  bucket = "${var.project_name}-images-${var.s3_bucket_suffix}"

  tags = {
    Name    = "${var.project_name}-images"
    Project = var.project_name
  }
}

resource "aws_s3_bucket_public_access_block" "hanbando_images" {
  bucket = aws_s3_bucket.hanbando_images.id

  # ACL 차단은 유지 — 모든 객체는 bucket policy 로만 공개
  block_public_acls  = true
  ignore_public_acls = true

  # 사용자 사진 + 일러스트는 frontend 가 <img src="https://...s3...">  로 직접 fetch.
  # bucket policy 로 GetObject 만 공개해야 하므로 아래 두 옵션은 false 필수.
  # PDCA new-species-cold-start-ux #I-7 drift 해소 (2026-05-17 AWS CLI 변경 동기화).
  block_public_policy     = false
  restrict_public_buckets = false
}

# 모든 객체 read 공개 (식물 사진 + 일러스트 — 민감 정보 없음)
resource "aws_s3_bucket_policy" "hanbando_images_public_read" {
  bucket = aws_s3_bucket.hanbando_images.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowPublicReadHanbandoImages"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.hanbando_images.arn}/*"
      }
    ]
  })

  # PublicAccessBlock 가 먼저 풀려야 정책 적용 가능
  depends_on = [aws_s3_bucket_public_access_block.hanbando_images]
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
