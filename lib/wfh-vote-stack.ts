import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import { DynamoEventSource } from '@aws-cdk/aws-lambda-event-sources';
import { PythonFunction } from '@aws-cdk/aws-lambda-python';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import { ServicePrincipal } from '@aws-cdk/aws-iam';

export class WfhVoteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //
    // STATIC SITE
    //

    // Static site hosting + deployment of assets
    const cfToS3 = new CloudFrontToS3(this, 'cfToS3', {
      insertHttpSecurityHeaders: false,
      cloudFrontDistributionProps: <cloudfront.DistributionProps>{
        defaultBehavior: {
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
      },
    });
    if (cfToS3.s3Bucket) {
      new s3deploy.BucketDeployment(this, 's3deploy', {
        sources: [s3deploy.Source.asset('./website')],
        destinationBucket: cfToS3.s3Bucket,
      });
    }

    // Output the Website URL
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: cfToS3.cloudFrontWebDistribution.domainName,
    });



    //
    // DYNAMODB TABLES
    //

    const companiesTable = new dynamodb.Table(this, 'companiesTable', {
      partitionKey: {
        name: 'Name',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    const companiesContacts = new dynamodb.Table(this, 'companiesContacts', {
      partitionKey: {
        name: 'CompanyName',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'EmailAddress',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    const companiesVotes = new dynamodb.Table(this, 'companiesVotes', {
      partitionKey: {
        name: 'CompanyName',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });


    const streamCompaniesLambda = new PythonFunction(this, 'streamCompaniesLambda', {
      entry: 'stream-companies-lambda',
      environment: {
        CompaniesStaticDumpS3Bucket: cfToS3.s3Bucket?.bucketName || '',
      },
      architectures: [
        lambda.Architecture.ARM_64,
      ],
      runtime: lambda.Runtime.PYTHON_3_8,
    });
    streamCompaniesLambda.addEventSource(new DynamoEventSource(companiesTable, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      maxBatchingWindow: cdk.Duration.seconds(5),
    }));
    cfToS3.s3Bucket?.grantReadWrite(streamCompaniesLambda);
    

    //
    // API
    //

    const api = new apigateway.RestApi(this, 'api', {
      deployOptions: {
        stageName: 'api',
      }
    });

    cfToS3.cloudFrontWebDistribution.addBehavior('api/*', new origins.HttpOrigin(`${api.restApiId}.execute-api.${this.region}.amazonaws.com`), {
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    });

    const integrationRole = new iam.Role(this, 'integrationRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
      inlinePolicies: {
        putCompany: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
              ],
              resources: [
                companiesTable.tableArn,
                companiesContacts.tableArn,
                companiesVotes.tableArn,
              ],
            }),
          ],
        }),
      },
    });

    // Loop over the API resource path definitions
    const apiPutDefinitions = [
      {
        resourcePath: 'companies',
        requestTemplate: {
          'application/json': `{ 
              "TableName": "${companiesTable.tableName}",
              "Item": {
                  "Name": {
                      "S": "$input.path('$.name')"
                  }
              }
          }`,
        },
      },
      {
        resourcePath: 'contacts',
        requestTemplate: {
          'application/json': `{ 
            "TableName": "${companiesContacts.tableName}",
            "Item": {
                "CompanyName": {
                    "S": "$input.path('$.company_name')"
                },
                "Name": {
                    "S": "$input.path('$.name')"
                },
                "EmailAddress": {
                    "S": "$input.path('$.email_address')"
                }
            }
        }`,
        },
      },
      {
        resourcePath: 'votes',
        requestTemplate: {
          'application/json': `{
            "ConditionExpression": "attribute_not_exists(CompanyName)",
            "TableName": "${companiesVotes.tableName}",
            "Item": {
              "CompanyName": {
                  "S": "$input.path('$.company_name')"
              },
              "Votes": {
                  "N": "1"
              },
              #if($input.path('$.vote_wfh') == 1)
                      "VoteWFH": {
                          "N": "1"
                      },
              #else
                      "VoteWFH": {
                          "N": "0"
                      },
              #end
              #if($input.path('$.vote_mix') == 1)
                      "VoteMix": {
                          "N": "1"
                      },
              #else
                      "VoteMix": {
                          "N": "0"
                      },
              #end
              #if($input.path('$.vote_office') == 1)
                      "VoteOffice": {
                          "N": "1"
                      }
              #else
                      "VoteOffice": {
                          "N": "0"
                      }
              #end
            }
          }`,
        },
      },
    ];
    apiPutDefinitions.forEach((apiResource) => {

      const dynmamoDbIntegration = new apigateway.AwsIntegration({
        service: 'dynamodb',
        action: 'PutItem',
        options: {
          credentialsRole: integrationRole,
          requestTemplates: apiResource.requestTemplate,
          integrationResponses: [
            {
              statusCode: '200',
              selectionPattern: '200',
              responseTemplates: {
                'application/json': '',
              }
            },
            {
              statusCode: '400',
              selectionPattern: '400',
              responseTemplates: {
                'application/json': '',
              }
            }
          ],
        },
      });

      const resource = api.root.addResource(apiResource.resourcePath);
      resource.addMethod('PUT', dynmamoDbIntegration, { 
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': apigateway.Model.EMPTY_MODEL,
            }
          },
          {
            statusCode: '400',
            responseModels: {
              'application/json': apigateway.Model.EMPTY_MODEL,
            }
          }
        ]
      });

    });

    const votesPostDynmamoDbIntegration = new apigateway.AwsIntegration({
      service: 'dynamodb',
      action: 'UpdateItem',
      options: {
        credentialsRole: integrationRole,
        requestTemplates: {
          'application/json': `{ 
            "TableName": "${companiesVotes.tableName}",
            "Key": {
                "CompanyName": {
                    "S": "$input.path('$.company_name')"
                }
            },
        #if($input.path('$.vote_wfh') == 1)
            "UpdateExpression": "ADD Votes :num, VoteWFH :num",
        #elseif($input.path('$.vote_mix') == 1)
            "UpdateExpression": "ADD Votes :num, VoteMix :num",
        #elseif($input.path('$.vote_office') == 1)
            "UpdateExpression": "ADD Votes :num, VoteOffice :num",
        #end    
            "ExpressionAttributeValues": {
                ":num": {"N": "1"}
            },
            "ReturnValues": "ALL_NEW"
        }`,
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `#set($inputRoot = $input.path('$'))
              {
                  "company_name": "$inputRoot.Attributes.CompanyName.S",
                  "vote_wfh": $inputRoot.Attributes.VoteWFH.N,
                  "vote_mix": $inputRoot.Attributes.VoteMix.N,
                  "vote_office": $inputRoot.Attributes.VoteOffice.N,
                  "votes": $inputRoot.Attributes.Votes.N
              }`,
            }
          },
        ]
      },
    });

    api.root.getResource('votes')?.addMethod('POST', votesPostDynmamoDbIntegration, { 
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          }
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          }
        }     
      ]
    });

  }
}
