import os, boto3, json
print('Loading function')

def handler(event, context):
    print(event)
    
    # Retrieve the existing companies JSON file
    s3 = boto3.client('s3')
    try:
        # Retrieve companies.json
        obj = s3.get_object(Bucket=os.environ['CompaniesStaticDumpS3Bucket'], Key='companies.json')
        companies_dict = json.loads(obj['Body'].read().decode('utf-8'))
    except: # **************** We need to better handle this exception so that we're confident it's a situation where companies.json doesn't exist.
        # Companies.json doens't exist, let's start new
        companies_dict = {'Companies':[]}
    
    # Loop through records to be added
    for record in event['Records']:
        if record['eventName'] == 'INSERT':
            companies_dict['Companies'].append(record['dynamodb']['NewImage']['Name']['S'])
    
    # Sort the list of companies
    companies_dict['Companies'] = sorted(list(set(companies_dict['Companies'])))
    
    # Push companies JSON file (back?) into S3
    s3.put_object(Body=bytes(json.dumps(companies_dict).encode('UTF-8')), Bucket=os.environ['CompaniesStaticDumpS3Bucket'], Key='companies.json')
        
    return "Successfully processed "+str(len(event['Records']))+" records.";