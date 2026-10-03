.PHONY: install dev dev-frontend dev-backend clean

# Install dependencies for both frontend and backend
install:
	@echo "Installing Frontend Dependencies..."
	cd frontend && npm install
	@echo "Installing Backend Dependencies..."
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
	@echo "All dependencies installed successfully."

# Run both frontend and backend concurrently with clean terminal output
dev:
	@echo "Starting ONBOARD Full Stack Environment..."
	@npx concurrently -c "blue.bold,green.bold" -n "NEXT,FASTAPI" \
		"cd frontend && npm run dev" \
		"cd backend && . .venv/bin/activate && uvicorn main:app --reload --port 8000"

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && . .venv/bin/activate && uvicorn main:app --reload --port 8000

# Clean up environments
clean:
	@echo "Cleaning up environments..."
	rm -rf frontend/node_modules
	rm -rf frontend/.next
	rm -rf backend/.venv
	rm -rf backend/__pycache__
	@echo "Cleaned up environments."
