const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://elearn-assignment.web.app',
    'https://elearn-assignment.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())

// Create Middleware 
const logger = (req, res, next) => {
  // console.log('log: info', req.method, req.url);
  next();
}

const verifyToken = async(req, res, next) => {
  const token = req.cookies?.token;
  console.log('Verify Token', token);
  // next();
  if(!token) {
    return res.status(401).send({message: 'Unauthorized Access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err) {
      return res.status(401).send({message:'Unauthorized Access'})
    }
    req.user = decoded;
    next();
  })
}


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

    // View all Assignment 
    app.get('/assignment', async(req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      
      console.log(page, size);
      const result = await assignmentCollection.find()
      .skip(page*size)
      .limit(size)
      .toArray();
      res.send(result);
    })

    // Pagination Count 
    app.get('/assignmentsCount', async(req, res) => {
      const count = await assignmentCollection.estimatedDocumentCount();
      res.send({count})
    })

    // View Single Assignment 
    app.get('/assignment/singleOne/:id', logger, async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const cursor = await assignmentCollection.findOne(query)
      res.send(cursor);
    })


    // Update Single Assignment 
    app.get('/assignment/updateOne/:id', logger, async(req, res) => {
      const id = req.params.id;
      // console.log("Token Oweneeeeeee", req.user);
      const query = {_id: new ObjectId(id)};
      const result = await assignmentCollection.findOne(query);
      res.send(result);
    })


    // Load for My Assignment Page 
    app.get('/submitAssignment/specificSubmission', logger, verifyToken, async(req, res) => {
      // console.log(req.query.email);
      // console.log('Token Owner', req.user);
      if(req.user.email !== req.query.email) {
        return res.status(403).send({message: 'Forbidden Access'});
      }
      let query = {};
      if(req.query?.email) {
        query = {userEmail: req.query.email}
      }

      const result = await submittedCollection.find(query).toArray();
      res.send(result);
    })


    // Load for Submitted Page
    app.get('/submitAssignment/allSubmission', logger, async(req, res) => {
      const result = await submittedCollection.find().toArray();
      res.send(result);
    })


    // Load for Pending Status Assignments 
    app.get('/submitAssignment/allSubmission/status', logger, async(req, res) => {
      const query = {status: "Pending"}
      const result = await submittedCollection.find(query).toArray();
      res.send(result);
    })


    // Jwt Generator
    app.post('/jwt',logger, async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'1h'});
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite:'none'
      })
      .send({success: true});
    })

    app.post('/logout', async(req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', {maxAge: 0}).send({success:true});
    })

    // Post new assignment 
    app.post('/assignment', async(req, res) => {
      const newAssignment = req.body;
      // console.log(newAssignment);
      const result = await assignmentCollection.insertOne(newAssignment);
      res.send(result);
    })

    // Post new Submission
    app.post('/submitAssignment', async(req, res) => {
      const newSubmission =req.body;
      // console.log(newSubmission);
      const result = await submittedCollection.insertOne(newSubmission)
      res.send(result);
    })

    // Update an Assignment 
    app.put('/assignment/updateOne/:id', logger, verifyToken, async(req, res) => {
      const id = req.params.id;
      if(req.user.email !== req.body.currentUserEmail) {
        return res.status(403).send({message: 'Forbidden Access'});
      }
      const updatedAssignment = req.body;
      const options = {upsert: true};
      const filter = {_id: new ObjectId(id)};
      
      // console.log('SEE', req.body.currentUserEmail);
      // console.log('QQQ', req.user.email);
      
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

    // Assignment Marking 
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

    // Delete an assignment 
    app.delete('/submitAssignment/allSubmission/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await submittedCollection.deleteOne(query);
      res.send(result);
    })





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
  // console.log(`Server is running ${port}`);
})
