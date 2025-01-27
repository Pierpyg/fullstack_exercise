const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();
const Person = require('./models/person');

const app = express();

// Middleware per abilitare CORS
app.use(cors({
  origin: 'https://render-test-frontend-dpnp.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Middleware per il parsing del JSON
app.use(express.json());

// Middleware di logging
app.use(morgan('tiny'));
morgan.token('body', (req) => JSON.stringify(req.body));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'));

// **Rotte API**
app.get('/api/persons', (request, response) => {
  Person.find({}).then(persons => {
    response.json(persons);
  });
});

app.get('/api/persons/:id', (request, response, next) => {
  Person.findById(request.params.id)
    .then(person => {
      if (person) {
        response.json(person);
      } else {
        response.status(404).end();
      }
    })
    .catch(error => next(error));
});

app.post('/api/persons', (request, response, next) => {
  const body = request.body;

  if (!body.name || !body.number) {
    return response.status(400).json({ error: 'content missing' });
  }

  Person.findOne({ name: body.name }).then(existingPerson => {
    if (existingPerson) {
      return response.status(400).json({ error: 'name must be unique' });
    } else {
      const person = new Person({
        name: body.name,
        number: body.number,
      });

      person.save()
        .then(savedPerson => {
          response.json(savedPerson);
        })
        .catch(error => next(error));
    }
  });
});

app.put('/api/persons/:id', (request, response, next) => {
  const { name, number } = request.body;

  const updatedPerson = {
    name,
    number,
  };

  Person.findByIdAndUpdate(
    request.params.id,
    updatedPerson,
    { new: true, runValidators: true, context: 'query' }
  )
    .then(updated => {
      if (updated) {
        response.json(updated);
      } else {
        response.status(404).json({ error: 'Person not found' });
      }
    })
    .catch(error => next(error));
});

app.delete('/api/persons/:id', (request, response, next) => {
  const id = request.params.id;

  Person.findByIdAndDelete(id)
    .then(result => {
      if (!result) {
        return response.status(404).json({ error: 'Person not found' });
      }
      response.status(204).end();
    })
    .catch(error => next(error));
});

// **Middleware per servire il frontend**
// Serve i file statici
app.use(express.static('public'));

// Middleware "catch-all" per richieste non API
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Middleware per la gestione degli errori
app.use((error, request, response, next) => {
  console.error('Error middleware:', error.message);

  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    return response.status(400).send({ error: 'Malformatted ID' });
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message });
  }

  next(error);
});

// Avvia il server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


