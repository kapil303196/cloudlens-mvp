# CloudSave AI — Test Infrastructure Files

These mock files are designed to trigger all 15 anti-pattern rules for testing.

## Files

| File | Format | Anti-Patterns Covered |
|------|--------|----------------------|
| `test-cdk-stack.ts` | AWS CDK TypeScript | Rules 1,2,3,4,5,6,7,8,9,11 |
| `test-terraform.tf` | Terraform HCL | Rules 1,2,3,4,9,12,13 |
| `test-cloudformation.yaml` | CloudFormation YAML | Rules 3,8,9,10,11,14,15 |
| `test-ecs-task.json` | ECS Task Definition | Rule 6 (over-allocated) |

## Creating test-bundle.zip

To test the ZIP handler, bundle all files:

```bash
cd test-files
zip test-bundle.zip test-cdk-stack.ts test-terraform.tf test-cloudformation.yaml test-ecs-task.json
```

Then upload `test-bundle.zip` to CloudSave AI.

## Expected Results (CDK Stack)

Uploading `test-cdk-stack.ts` should produce approximately:

- **Lambda Overprovisioned**: 2 functions × ~$160/mo = ~$320/mo savings
- **Lambda Long Timeout**: 2 functions × ~$40/mo = ~$80/mo savings
- **RDS MultiAZ in Dev**: 1 instance × ~$200/mo = ~$200/mo savings
- **RDS Oversized Instance**: 1 instance × ~$300/mo = ~$300/mo savings
- **ECS Over-Scaled**: 1 service × ~$150/mo = ~$150/mo savings
- **ECS Fargate Waste**: 1 service × ~$100/mo = ~$100/mo savings
- **API GW + NLB**: 1 API × ~$180/mo = ~$180/mo savings
- **API GW REST vs HTTP**: 1 API × ~$70/mo = ~$70/mo savings
- **S3 No Lifecycle**: 2 buckets × ~$50/mo = ~$100/mo savings
- **NAT Gateway Overuse**: 3 NATs → ~$90/mo savings

**Total estimated: ~$1,590/month = ~$19,080/year**
