import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Code, Function, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda'
import { join } from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb'
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';


export class ThumbnailServiceCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'thumbnail-tbl', {
       partitionKey: {name: 'id', type: AttributeType.STRING},
       billingMode: BillingMode.PAY_PER_REQUEST,
       removalPolicy: RemovalPolicy.DESTROY
    });



    const handler = new Function(this, 'handler-function-resizeImg', {
      runtime: Runtime.PYTHON_3_8,
      timeout: Duration.seconds(20),
      handler: 'app.s3_thumbnail_generator',
      code: Code.fromAsset(join(__dirname, '../lambdas')),
      layers: [LayerVersion.fromLayerVersionArn(
        this,
        "PIL",
        "arn:aws:lambda:us-west-2:770693421928:layer:Klayers-python38-Pillow:15"
      )],
      environment: {
         MY_TABLE: table.tableName,
         REGION_NAME: "us-west-2",
         THUMBNAIL_SIZE: "128"
      }
    });
    
    // Grant permission for lambda to writeread
    table.grantReadWriteData(handler)


      // List all thumbnails
      const handlerListThumbnails = new Function(this, 'handler-function-list-thumbs', {
        runtime: Runtime.PYTHON_3_8, 
        handler: 'app.s3_get_thumbnail_urls', // we are using python here!
        timeout: Duration.seconds(20),
        memorySize: 512,
        code: Code.fromAsset(join(__dirname, '../lambdas')),
        layers: [LayerVersion.fromLayerVersionArn(this,"PIL-2", 'arn:aws:lambda:us-west-2:770693421928:layer:Klayers-python38-Pillow:15' )],
        environment: {
          MY_TABLE: table.tableName,
          REGION_NAME: "us-west-2",
          THUMBNAIL_SIZE: "128",
         
        }
      });
      table.grantReadData(handlerListThumbnails)

    const s3Bucket = new s3.Bucket(this, 'photo-bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
    s3Bucket.grantReadWrite(handler);

    s3Bucket.addEventNotification(s3.EventType.OBJECT_CREATED,
    new s3n.LambdaDestination(handler));

    handler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:*'],
        resources: ['*'] //'s3:PutObject, 's3:GetObject'


      })
    );

    // Create the REST api
    const thumbsApi = new RestApi(this, "thumb-api", {
       description: "List all thumbnails and metada"
    });

    // LambdaIntegration
    const handlerApiIntegration = new LambdaIntegration(handlerListThumbnails,
    {requestTemplates: {"application/json": '{"statusCode": "200"}'}});

    const mainPath = thumbsApi.root.addResource("images");
    mainPath.addMethod("GET", handlerApiIntegration)











  
  }
}
