from pymongo import MongoClient
from pymongo import ReturnDocument


class DBManager():
    def __init__(self, host, port):
        self.conn = MongoClient(host, port)
        self.db = None
        self.collection = None

    def set_db(self, name):
        self.db = self.conn[name]

    def authenticate(self, user, password):
        self.db.authenticate(user, password)

    def set_collection(self, name):
        self.collection = self.db[name]

    def save_single(self, doc):
        result = self.collection.insert_one(doc)
        return result.inserted_id

    def get_single(self, id):
        return self.collection.find_one(id)

    def update_single(self, doc, id):
        result = self.collection.find_one_and_update({'_id': id}, {'$set': doc}, return_document=ReturnDocument.AFTER)
        return result
