import random

# Challenge:
# 1. pull quotes from a json file api somewhere
# 2. create a function where you process those quotes
# each time, scheduled event, you will be serving to the REST api
# A random quote
# Challenge 2:
# shcheduled emails where random quotes are sent to subscribers!
#
#

def handler(event, context):
    quotes = ["Life is good everyday!",
              "Be humble and conquer.", "Learn, learn and learn!"]
    ran_quote = random.sample(quotes, 1)[0]
    print(ran_quote)
