// ===== Quick Start Script =====
// scripts/quick-start.sh
#!/bin/bash

echo "🚀 Pramaan Quick Start"
echo "===================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Backend setup
echo -e "\n${YELLOW}Setting up Backend...${NC}"
cd backend
npm install
cp .env.example .env
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# Create directories
mkdir -p logs certificates uploads
echo -e "${GREEN}✅ Directories created${NC}"

# Mobile setup
echo -e "\n${YELLOW}Setting up Mobile App...${NC}"
cd ../mobile
npm install

# iOS setup (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    cd ios && pod install && cd ..
    echo -e "${GREEN}✅ iOS dependencies installed${NC}"
fi

echo -e "\n${GREEN}✨ Setup Complete!${NC}"
echo -e "\n${YELLOW}To run the application:${NC}"
echo "1. Start MongoDB"
echo "2. Backend: cd backend && npm run dev"
echo "3. Mobile: cd mobile && npm run android (or ios)"