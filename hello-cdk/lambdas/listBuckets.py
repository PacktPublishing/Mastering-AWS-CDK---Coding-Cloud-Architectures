
import boto3

client = boto3.client('s3')


def main(event, context):
    response = client.list_buckets()
    list = []
    for bucket in response['Buckets']:
        list.append(bucket['Name'])
        print(f' {bucket["Name"]}')

    return list
