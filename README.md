# Visual UI Testing MCP Server

A comprehensive Model Context Protocol (MCP) server for automated UI testing, browser automation, and web application testing.

## Features

- **Browser Management**: Launch, control, and manage browser instances
- **Element Interactions**: Find, click, type, and interact with web elements
- **Smart Waiting**: Advanced waiting mechanisms for dynamic content, network idle, JS execution, and animations
- **Form Handling**: Fill and submit web forms with validation and structured error responses
- **Structured Error Responses**: Returns actionable validation feedback instead of protocol exceptions
- **Visual Testing**:
  - Selective screenshot capture (element, region, or full-page)
  - Visual regression and diffing with pixel-level comparison
  - Responsive breakpoint testing (mobile, tablet, desktop)
  - Multiple format support (PNG, JPEG, WebP) with quality options
- **Performance Monitoring**: Core Web Vitals, metrics collection, regression tracking
- **Backend Mocking**: API mocking and request simulation for testing
- **User Journey Recording**: Record and replay user interactions
- **Browser Monitoring Tools**: Console logs, network monitoring, JavaScript errors, and performance metrics

## Tech Stack

This project is built with modern technologies for optimal performance and developer experience:

### Core Technologies

- **TypeScript**: Type-safe JavaScript for robust development
- **Node.js**: Runtime environment (Node 20+)
- **ES Modules**: Modern JavaScript module system
- **Model Context Protocol SDK**: Framework for building MCP servers and tools
- **Playwright**: Browser automation and testing framework
- **Pixelmatch**: Pixel-level image comparison for visual regression testing

### Build Tools

- **Vite**: Fast build tool, development server, and declaration file generation
- **vite-plugin-dts**: TypeScript declaration file generation plugin

### Development Tools

- **tsx**: Enhanced TypeScript execution for development
- **Vite**: Development server with hot module replacement

### Import Aliases

The project uses path aliases for cleaner imports:

- `@/*` → `src/*`
- `@core/*` → `src/core/*`
- `@tool/*` → `src/tool/*`
- `@types/*` → `src/types/*`
- `@utils/*` → `src/utils/*`

Example usage:

```typescript
// Instead of: import { someTool } from '../../../tool/someTool'
// Use: import { someTool } from '@tool/someTool'
// Instead of: import { someType } from '../../../types/someType'
// Use: import { someType } from '@types/someType'
```

**Note:** Import aliases are configured in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts` for consistent resolution across TypeScript compilation, build, and test environments.

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install-browsers
```

## Development Guidance

### Build Tool Configuration

This project uses **Vite** as the build tool for optimal development experience and fast builds:

- **Vite Configuration**: The project includes Vite configuration for handling TypeScript, ES modules, and development server setup
- **Build Process**: Use `npm run build` to create production builds with Vite's optimized bundling. Build should fail if there any type issues.
- **Development Mode**: Use `npm run dev` for fast development with hot module replacement

### MCP SDK Best Practices

When developing MCP tools and server functionality:

- **Use Official SDK**: Always use `@modelcontextprotocol/sdk` for all server and client functionality instead of implementing custom MCP protocol components
- **Standard Transports**: Utilize the official `StdioClientTransport` for stdio communication rather than custom transport implementations
- **Protocol Compliance**: Follow the MCP specification using the SDK's built-in types and interfaces for consistency
- **Error Handling**: Leverage the SDK's built-in error types and handling mechanisms for proper MCP error responses

### Documentation and Version Management

For the latest documentation and version information:

- **Context7 MCP Server**: Use the Context7 MCP server to access up-to-date documentation for dependencies and libraries
- **Library Documentation**: Query Context7 for specific library documentation using the format `/org/project` (e.g., `/vitejs/vite`, `/microsoft/playwright`)
- **Version Updates**: Check Context7 for latest versions and migration guides when updating dependencies

## Usage

```bash
# Start the MCP server in headless mode (default)
npm run dev

# Start the MCP server in headed mode for local testing
HEADLESS=false npm run dev

# The server communicates via stdio MCP protocol
# Can be used with MCP clients like Claude Desktop
```

## Development Workflow

### 🚀 Quick Start Workflow

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npm run install-browsers

# 3. Start development server
npm run dev

# 4. Run E2E tests to verify functionality
npm run test:e2e

# 5. Build for production
npm run build
```

### 🛠️ Development Workflow

```bash
# Install all dependencies
npm install

# Install Playwright browsers for testing
npm run install-browsers

# Verify MCP server starts correctly
npm run dev
# Server should start without errors and be ready for MCP client connections
```

### 🔧 Development Tips

1. **Use Import Aliases**: `@/*`, `@core/*`, `@tool/*`, `@types/*`, `@utils/*` for clean imports
2. **Implement McpTool Interface**: All tools must implement the `McpTool` interface from `@types/mcp.ts`
3. **Separate Concerns**: Keep core business logic in `src/core/`, MCP protocol in `src/tool/`
4. **Leverage MCP SDK**: Always use official SDK types and transports
5. **Use context7**: for latest api documentation to avoid rework
6. **Test Real Behavior**: E2E tests verify actual MCP protocol usage
7. **Build Frequently**: Use `npm run build` to catch issues early
8. **Use TypeScript**: Full type safety with MCP SDK integration enforced at build time

### Testing

1. **No unit tests** rather concentrate on tool testing
2. **Tool test** through Client api. Connect to server and call the tool by using its signature.
3. **Server** is connected through client to test the functionality
4. **No mocking**

## Configuration

The server can be configured through environment variables and MCP client initialization parameters.

## Repository Structure

The project follows a clean architecture with separation of concerns for MCP tools, core logic, and shared types:

```
visual-ui-mcp-server/
├── src/
│   ├── core/               # 🏗️ Core business logic and automation
│   │   └── element-locator.ts     # Playwright browser automation logic
│   ├── tool/               # 🛠️ MCP tool implementations
│   │   └── element-locator-tool.ts # MCP-specific tool wrapper
│   ├── types/              # 📋 Shared type definitions & MCP interfaces
│   │   └── mcp.ts          # MCP tool contracts and interfaces
│   └── server.ts           # 🎼 Main server orchestrator & tool coordination
├── test/
│   └── e2e/                # End-to-end tests for MCP tool verification
├── CHANGELOG.md            # Version history and implemented features
├── feature_prompts.md      # LLM-optimized prompts and feature roadmap
├── mcp-config.json         # MCP server configuration
├── package.json            # Dependencies and scripts
├── README.md
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
├── vitest.config.ts        # Vitest E2E test configuration
└── .gitignore
```

### Architecture Benefits

- **🏗️ Core Isolation**: Business logic separate from MCP protocol details
- **🛠️ Tool Contracts**: MCP tools follow consistent interfaces via `src/types/mcp.ts`
- **📋 Type Safety**: Shared interfaces ensure proper implementation
- **🎼 Clean Server**: Server focuses on coordination, not tool logic
- **🔧 Easy Extension**: Add new tools by implementing the `McpTool` interface

### Development Workflow

1. **New Core Logic** → Add to `src/core/`
2. **MCP Tool Wrapper** → Implement in `src/tool/` using core functionality
3. **Interface Compliance** → Follow contracts in `src/types/mcp.ts`
4. **Server Registration** → Server coordinates tool registration automatically

See `feature_prompts.md` for detailed implementation guidance per phase.

## License

MIT
