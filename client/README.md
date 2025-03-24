# Mendel WebApp

This is a React-based web application built using Vite. It leverages modern UI libraries such as Material UI, Tailwind CSS, and React Router for seamless navigation.

## Tech Stack

- **React** (v19.0.0)
- **Vite** (v6.2.0)
- **Material UI** (v6.4.8)
- **Tailwind CSS** (v4.0.15)
- **React Router DOM** (v7.4.0)
- **Axios** (v1.8.4)

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/arman-dogru/mendel-webapp.git
   cd mendel-webapp/client
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

### Running the Development Server

To start the development server, run:

```sh
npm run dev
```

This will start the Vite development server, and the application will be available at `http://localhost:5173` (default port).

### Building the Project

To create a production build, run:

```sh
npm run build
```

### Linting

To check for linting errors, run:

```sh
npm run lint
```

### Previewing the Build

To preview the production build locally:

```sh
npm run preview
```

## Project Structure

```
client/
│-- node_modules/
│-- public/
│-- src/
│   ├── components/   # Reusable UI components
│   ├── pages/        # Page components
│   ├── hooks/        # Custom hooks
│   ├── styles/       # Tailwind and global styles
│   ├── App.jsx       # Main app component
│   ├── main.jsx      # Entry point
│-- .env              # Environment variables
│-- package.json
│-- vite.config.js    # Vite configuration
│-- README.md
```

## Environment Variables

Create a `.env` file in the root directory and add the necessary environment variables.
Example:

```sh
VITE_API_BASE_URL=http://localhost:5000
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is open-source and available under the [MIT License](LICENSE).

---

Happy coding! 🚀
