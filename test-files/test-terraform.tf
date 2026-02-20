# =============================================
# CloudSave AI — Mock Terraform Test Config
# Contains anti-patterns: Lambda, RDS, DynamoDB, ElastiCache
# =============================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# ==========================================
# RULE 1: Lambda Overprovisioned Memory (3072MB)
# ==========================================
resource "aws_lambda_function" "processPaymentsFunction" {
  function_name = "process-payments-staging"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  role          = aws_iam_role.lambda_role.arn
  filename      = "lambda.zip"
  memory_size   = 3072        # ⚠️ ANTI-PATTERN: Over-provisioned (Rule 1)
  timeout       = 450         # ⚠️ ANTI-PATTERN: Long timeout (Rule 2)
}

resource "aws_lambda_function" "analyzeDataFunction" {
  function_name = "analyze-data-dev"
  runtime       = "python3.12"
  handler       = "lambda_handler.main"
  role          = aws_iam_role.lambda_role.arn
  filename      = "analyze.zip"
  memory_size   = 2560        # ⚠️ ANTI-PATTERN: Over-provisioned (Rule 1)
  timeout       = 300         # Borderline timeout
}

# ==========================================
# RULE 3: RDS MultiAZ in Staging (CRITICAL)
# ==========================================
resource "aws_db_instance" "stagingDatabase" {
  identifier        = "staging-app-db"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.r5.xlarge"   # ⚠️ ANTI-PATTERN: xlarge in staging (Rule 4)
  allocated_storage = 200
  multi_az          = true              # ⚠️ ANTI-PATTERN: MultiAZ in staging (Rule 3)
  db_name           = "staging_db"
  username          = "admin"
  password          = "change-in-production"
  skip_final_snapshot = true
  tags = {
    Environment = "staging"
  }
}

# ==========================================
# RULE 12: DynamoDB Provisioned Capacity
# ==========================================
resource "aws_dynamodb_table" "userSessionsTable" {
  name         = "user-sessions"
  billing_mode = "PROVISIONED"   # ⚠️ ANTI-PATTERN: Should be PAY_PER_REQUEST (Rule 12)
  read_capacity  = 200
  write_capacity = 100

  hash_key = "session_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "productCatalogTable" {
  name         = "product-catalog"
  billing_mode = "PROVISIONED"   # ⚠️ ANTI-PATTERN: Provisioned for variable catalog (Rule 12)
  read_capacity  = 500
  write_capacity = 50

  hash_key  = "product_id"
  range_key = "category"

  attribute {
    name = "product_id"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }
}

# ==========================================
# RULE 13: ElastiCache Oversized (r5.large x4)
# ==========================================
resource "aws_elasticache_replication_group" "sessionCacheCluster" {
  replication_group_id = "session-cache-staging"
  description          = "Session cache for staging"
  node_type            = "cache.r5.large"  # ⚠️ ANTI-PATTERN: Oversized nodes (Rule 13)
  num_node_groups      = 4                 # ⚠️ ANTI-PATTERN: 4 node groups (Rule 13)
  engine               = "redis"
  engine_version       = "7.0"
  port                 = 6379
}

# ==========================================
# Supporting Resources
# ==========================================
resource "aws_iam_role" "lambda_role" {
  name = "lambda-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_s3_bucket" "deploymentArtifacts" {
  bucket = "logicspark-staging-artifacts"
  # ⚠️ ANTI-PATTERN: No lifecycle policy (Rule 9)
}

resource "aws_nat_gateway" "primary_nat" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = "subnet-abc123"
  tags = { Name = "staging-nat-1" }
}

resource "aws_nat_gateway" "secondary_nat" {
  allocation_id = aws_eip.nat_eip_2.id
  subnet_id     = "subnet-def456"
  tags = { Name = "staging-nat-2" }
}

resource "aws_eip" "nat_eip" { domain = "vpc" }
resource "aws_eip" "nat_eip_2" { domain = "vpc" }
