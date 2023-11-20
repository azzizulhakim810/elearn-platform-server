const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// console.log(process.env.DB_USER)
// console.log(process.env.DB_PASS)



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@atlascluster.sztfigr.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
 const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const assignmentCollection = client.db('assignmentDB').collection('assignment');
    const submittedCollection = client.db('assignmentDB').collection('submission');


    app.get('/assignment', async(req, res) => {
      const cursor = assignmentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    // View Single Assignment 
    app.get('/assignment/singleOne/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const cursor = await assignmentCollection.findOne(query)
      res.send(cursor);
    })
    // Update Single Assignment 
    app.get('/assignment/updateOne/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await assignmentCollection.findOne(query);
      res.send(result);
    })
    // Load for My Assignment Page 
    app.get('/submitAssignment/specificSubmission', async(req, res) => {
      // console.log(req.query.email);
      let query = {};
      if(req.query?.email) {
        query = {userEmail: req.query.email}
      }

      const result = await submittedCollection.find(query).toArray();
      res.send(result);
    })
    // Load for Submitted Page
    app.get('/submitAssignment/allSubmission', async(req, res) => {
      const result = await submittedCollection.find().toArray();
      res.send(result);
    })
    // Load for Pending Status Assignments 
    app.get('/submitAssignment/allSubmission/status', async(req, res) => {
      const query = {status: "Pending"}
      const result = await submittedCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/assignment', async(req, res) => {
      const newAssignment = req.body;
      // console.log(newAssignment);
      const result = await assignmentCollection.insertOne(newAssignment);
      res.send(result);
    })
    app.post('/submitAssignment', async(req, res) => {
      const newSubmission =req.body;
      // console.log(newSubmission);
      const result = await submittedCollection.insertOne(newSubmission)
      res.send(result);
    })
    app.put('/assignment/updateOne/:id', async(req, res) => {
      const id = req.params.id;
      const options = {upsert: true};
      const filter = {_id: new ObjectId(id)};
      const updatedAssignment = req.body;
      const assignment = {
        $set:{
          title: updatedAssignment.title,
          url: updatedAssignment.url,
          marks: updatedAssignment.marks,
          level: updatedAssignment.level,
          description: updatedAssignment.description,
          date: updatedAssignment.date,
          userEmail: updatedAssignment.currentUserEmail

        }
      }
      const result = await assignmentCollection.updateOne(filter, assignment, options);
      res.send(result);
    })

    app.patch('/submitAssignment/allSubmission/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedAssignment = req.body;
      // console.log(updatedAssignment);
      const updatedStatus = {
        $set:{
          status:updatedAssignment.status,
          obtainedMark: updatedAssignment.obtainedMark,
          feedback: updatedAssignment.feedback,
        }
      };
      const result = await submittedCollection.updateOne(filter, updatedStatus);
      res.send(result);
    });
    app.delete('/submitAssignment/allSubmission/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await submittedCollection.deleteOne(query);
      res.send(result);
    })





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir); 



app.get('/', (req, res) => {
  res.send("Elearn platform is running");
})

app.listen(port, () => {
  console.log(`Server is running ${port}`);
})
