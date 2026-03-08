#!/bin/bash

# Development Helper Script for Bonyad App
# Usage: ./dev.sh [option]

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_menu() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     BONYAD APP - DEV LAUNCHER          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Choose where to run the app:${NC}"
    echo ""
    echo "  1) 📱  iOS Simulator (Mac only)"
    echo "  2) 🤖  Android Simulator"
    echo "  3) 🌐  Web Browser (Fastest)"
    echo "  4) 📲  Start bundler + QR (Physical device)"
    echo "  5) 🔄  Clear cache & start"
    echo ""
    echo "  0) ❌  Exit"
    echo ""
}

run_ios() {
    echo -e "${YELLOW}Starting iOS Simulator...${NC}"
    npx expo run:ios
}

run_android() {
    echo -e "${YELLOW}Starting Android Simulator...${NC}"
    npx expo run:android
}

run_web() {
    echo -e "${YELLOW}Starting Web Browser...${NC}"
    echo -e "${GREEN}Open: http://localhost:8081${NC}"
    npx expo start --web
}

run_bundler() {
    echo -e "${YELLOW}Starting Metro bundler...${NC}"
    echo -e "${GREEN}Scan the QR code with Expo Go app${NC}"
    echo -e "${GREEN}Press 'i' for iOS simulator, 'a' for Android${NC}"
    npx expo start
}

clear_and_start() {
    echo -e "${YELLOW}Clearing cache...${NC}"
    rm -rf .expo
    npx expo start --clear
}

# Main
if [ "$1" == "ios" ]; then
    run_ios
    exit 0
elif [ "$1" == "android" ]; then
    run_android
    exit 0
elif [ "$1" == "web" ]; then
    run_web
    exit 0
elif [ "$1" == "device" ]; then
    run_bundler
    exit 0
elif [ "$1" == "clear" ]; then
    clear_and_start
    exit 0
fi

# Interactive menu
while true; do
    show_menu
    read -p "Enter your choice [0-5]: " choice
    
    case $choice in
        1)
            run_ios
            break
            ;;
        2)
            run_android
            break
            ;;
        3)
            run_web
            break
            ;;
        4)
            run_bundler
            break
            ;;
        5)
            clear_and_start
            break
            ;;
        0)
            echo "Goodbye! 👋"
            exit 0
            ;;
        *)
            echo "Invalid option. Press any key to continue..."
            read -n 1
            ;;
    esac
done
