variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "프로젝트명 (리소스 태그/이름에 사용)"
  type        = string
  default     = "hanbando"
}

variable "instance_type" {
  description = "EC2 인스턴스 타입"
  type        = string
  default     = "t3.small"
}

variable "key_pair_name" {
  description = "EC2 SSH 접속용 기존 키페어 이름 (AWS 콘솔에서 사전 생성)"
  type        = string
  # terraform.tfvars 에서 설정: key_pair_name = "hanbando"
}

variable "my_ip_cidr" {
  description = "SSH 허용 IP (내 IP/32 형식). 본선장 Wi-Fi IP로 갱신 필요."
  type        = string
  # terraform.tfvars 에서 설정: my_ip_cidr = "x.x.x.x/32"
  # 임시로 전체 허용이 필요하면 "0.0.0.0/0" — 단, 보안상 본선 후 제거
}

variable "s3_bucket_suffix" {
  description = "S3 버킷 이름 접미사 (전역 유일성 보장용 — 예: 찬영 생년월일 4자리)"
  type        = string
  default     = "popo"
}
