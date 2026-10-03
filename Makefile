.PHONY: install dev dev-frontend dev-backend clean

# Install dependencies for both frontend and backend
install:
	@echo "Installing Frontend Dependencies..."
	cd frontend && npm install
	@echo "Installing Backend Dependencies..."
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

# Run both frontend and backend concurrently
dev:
	@echo "Starting ONBOARD Full Stack..."
	@make -j 2 dev-frontend dev-backend

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && . .venv/bin/activate && uvicorn main:app --reload --port 8000

# Clean up environments
clean:
	rm -rf frontend/node_modules
	rm -rf frontend/.next
	rm -rf backend/.venv
	rm -rf backend/__pycache__
	@echo "Cleaned up environments."
