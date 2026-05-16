resource "aws_iam_role" "hanbando_ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = {
    Project = var.project_name
  }
}

resource "aws_iam_policy" "hanbando_s3_write" {
  name        = "${var.project_name}-s3-write"
  description = "EC2가 이미지 버킷에 업로드만 할 수 있는 최소 권한"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
      Resource = "${aws_s3_bucket.hanbando_images.arn}/*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "hanbando_s3" {
  role       = aws_iam_role.hanbando_ec2.name
  policy_arn = aws_iam_policy.hanbando_s3_write.arn
}

resource "aws_iam_instance_profile" "hanbando" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.hanbando_ec2.name
}
