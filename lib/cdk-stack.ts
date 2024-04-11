import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as apigw from "@aws-cdk/aws-apigateway";

export class mimicCdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Dynamodb table definition
    const table = new dynamodb.Table(this, "mimic-cdk", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
    });

    // lambda function
    const mimicListens = new lambda.Function(this, "mimicListensLambdaHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.AssetCode.fromAsset("repository/src"),
      handler: "mimicListens.lambdaHandler",
      environment: {
        DYNAMO_DB_USE_LOCAL: "false",
        DYNAMO_DB_REGION: "eu-central-1",
        MIMIC_TABLE: table.tableName
      },
    });

    const mimicResponse = new lambda.Function(this, "mimicResponseLambdaHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.AssetCode.fromAsset("repository/src"),
      handler: "mimicResponse.lambdaHandler",
      environment: {
        DYNAMO_DB_USE_LOCAL: "false",
        DYNAMO_DB_REGION: "eu-central-1",
        MIMIC_TABLE: table.tableName
      },
    });

    // permissions to lambda to dynamo table
    table.grantReadWriteData(mimicListens);
    table.grantReadWriteData(mimicResponse);

    // create the API Gateway with one method and path
    const api = new apigw.RestApi(this, "mimi-api-ckd");

    // api.root
    //     .resourceForPath("mimic")
    //     .addMethod("POST", new apigw.LambdaIntegration(mimicListens));

    const listensGetIntegration = new apigw.LambdaIntegration(mimicListens);
    const responseIntegration = new apigw.LambdaIntegration(mimicResponse);

    const mimicResource = api.root.addResource("mimic");

    mimicResource.addMethod("POST",listensGetIntegration);

    const mimiPathResponseResource = mimicResource.addResource("{id}");
    mimiPathResponseResource.addMethod("GET",responseIntegration);

    new cdk.CfnOutput(this, "HTTP API URL", {
      value: api.url ?? "Something went wrong with the deploy",
    });
  }
}
