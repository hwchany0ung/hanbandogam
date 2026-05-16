output "ec2_eip" {
  description = "EC2 퍼블릭 IP (EIP) — SSH 접속 및 DNS A레코드 설정에 사용"
  value       = aws_eip.hanbando.public_ip
}

output "ssh_command" {
  description = "EC2 SSH 접속 명령어"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_eip.hanbando.public_ip}"
}

output "s3_bucket_name" {
  description = "이미지 업로드 S3 버킷명"
  value       = aws_s3_bucket.hanbando_images.bucket
}

output "ec2_public_dns" {
  description = "EC2 퍼블릭 DNS (도메인 미보유 시 Caddy tls internal 대용으로 사용)"
  value       = aws_instance.hanbando.public_dns
}
