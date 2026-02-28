# Stelna Chatbot

An intelligent AI-powered chatbot application with RAG (Retrieval Augmented Generation) capabilities, featuring advanced conversation management, intent classification, and product-specific knowledge integration.

## Features

- 🤖 **AI-Powered Conversations**: Leverages OpenAI and Groq SDK for intelligent responses
- 🔍 **RAG Implementation**: Vector-based semantic search for accurate knowledge retrieval
- 💬 **Intent Classification**: Automatic classification of user intents for contextual responses
- 📊 **Product Chat Service**: Specialized service for product-related queries
- 🧠 **Process Engine**: Automated decision-making and workflow orchestration
- 📚 **Knowledge Base**: Comprehensive knowledge about materials, pricing, processes, and tolerances
- 🗄️ **Vector Database**: Efficient semantic search using MongoDB vector indices
- 🎨 **Modern UI**: React-based frontend with responsive design

## Project Structure

```
chatbot3/
├── stelna-chatbot/
│   ├── backend/              # Node.js/Express backend
│   │   ├── ai/              # AI services and orchestration
│   │   │   ├── conversationService.js
│   │   │   ├── intentClassifier.js
│   │   │   ├── orchestrator.js
│   │   │   ├── productChatService.js
│   │   │   └── ragService.js
│   │   ├── config/          # Database configuration
│   │   ├── knowledge/       # Knowledge base files
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   └── services/        # Business logic services
│   └── frontend/            # React frontend application
│       ├── public/
│       └── src/
│           ├── components/  # React components
│           └── assets/      # Static assets
```

## Technology Stack

### Backend
- **Node.js** & **Express** - Server framework
- **MongoDB** & **Mongoose** - Database and ODM
- **OpenAI API** - Language model integration
- **Groq SDK** - AI model acceleration
- **Vector Search** - Semantic search capabilities

### Frontend
- **React 19** - UI framework
- **React Markdown** - Markdown rendering
- **Chart.js** - Data visualization
- **CSS3** - Styling

## Prerequisites

Before running this project, make sure you have:

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- OpenAI API key
- Groq API key (optional)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chatbot3/stelna-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `backend` directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   OPENAI_API_KEY=your_openai_api_key
   GROQ_API_KEY=your_groq_api_key
   PORT=5000
   ```

4. **Build vector database** (optional)
   ```bash
   cd backend
   node scripts/buildVectorDB.js
   ```

## Running the Application

### Development Mode

Run both frontend and backend concurrently:
```bash
npm start
```

Or run them separately:

**Backend only:**
```bash
cd backend
npm start
```

**Frontend only:**
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## API Endpoints

- `POST /api/chat` - Main chat endpoint
- `POST /api/hybrid-chat` - Hybrid chat with RAG
- Additional endpoints in the routes directory

## Features in Detail

### RAG Service
The chatbot uses Retrieval Augmented Generation to provide accurate, context-aware responses by:
1. Converting user queries into embeddings
2. Searching the vector database for relevant knowledge
3. Augmenting the LLM prompt with retrieved context

### Intent Classification
Automatically classifies user intents to route queries to the appropriate service:
- Product inquiries
- Process questions
- Pricing information
- Technical specifications

### Knowledge Base
The system includes comprehensive knowledge about:
- Materials and their properties
- Pricing rules and calculations
- Manufacturing processes
- Tolerances and specifications

## Scripts

- `npm start` - Start both frontend and backend
- `npm run start:backend` - Start backend only
- `npm run start:frontend` - Start frontend only
- `node backend/scripts/buildVectorDB.js` - Build vector database
- `node backend/scripts/updateProcesses.js` - Update process knowledge

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Contact

For questions or support, please open an issue in the repository.

## Acknowledgments

- OpenAI for GPT models
- Groq for AI acceleration
- MongoDB for vector search capabilities
