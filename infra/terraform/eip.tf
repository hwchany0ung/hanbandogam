resource "aws_eip" "hanbando" {
  instance = aws_instance.hanbando.id
  domain   = "vpc"

  tags = {
    Name    = "${var.project_name}-eip"
    Project = var.project_name
  }
}
