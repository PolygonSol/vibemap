# 🚀 Vibemap Setup Guide for Non-Developers

## 📖 What is a "Local Environment"?

Think of a **local environment** like having your own private copy of the Vibemap application running on your computer, just like the one you see on the website, but it's running directly on your machine instead of on a server somewhere else.

### 🏠 **Real-World Analogy:**
- **Website (Production)**: Like visiting a restaurant to eat
- **Local Environment**: Like having the same restaurant's kitchen in your own home

### 💡 **Why Set Up a Local Environment?**
- **Test Changes**: Try new features before they go live
- **Learn**: Understand how the application works
- **Develop**: Make improvements or customizations
- **Debug**: Fix issues without affecting the live website
- **Practice**: Experiment without consequences

---

## 🛠️ **Prerequisites - What You Need**

### **1. Computer Requirements**
- **Operating System**: Windows 10/11, macOS, or Linux
- **RAM**: At least 4GB (8GB recommended)
- **Storage**: At least 2GB free space
- **Internet**: Required for downloading tools and dependencies

### **2. Required Software**
You'll need to install these tools (don't worry, we'll guide you through each one):

1. **Node.js** - The engine that runs the application
2. **Git** - Tool for downloading and managing code
3. **Code Editor** - To view and edit the code (optional)

---

## 📥 **Step 1: Install Node.js**

### **What is Node.js?**
Node.js is like the engine that powers the Vibemap application. It's what makes all the code run on your computer.

### **Installation Instructions:**

#### **For Windows:**
1. **Go to**: https://nodejs.org/
2. **Download** the "LTS" version (it will say "LTS" in green)
3. **Run the installer** you downloaded
4. **Follow the installation wizard** (click "Next" through all steps)
5. **Restart your computer** after installation

#### **For macOS:**
1. **Go to**: https://nodejs.org/
2. **Download** the "LTS" version for macOS
3. **Open the downloaded file** (.pkg file)
4. **Follow the installation wizard**
5. **Restart your computer** after installation

#### **For Linux:**
```bash
# Open terminal and run:
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### **Verify Installation:**
1. **Open Command Prompt** (Windows) or **Terminal** (Mac/Linux)
2. **Type**: `node --version`
3. **Press Enter**
4. **You should see** something like `v18.17.0` (the version number)

---

## 📥 **Step 2: Install Git**

### **What is Git?**
Git is like a delivery service that brings the Vibemap code to your computer from GitHub (where the code is stored online).

### **Installation Instructions:**

#### **For Windows:**
1. **Go to**: https://git-scm.com/download/win
2. **Download** the latest version
3. **Run the installer**
4. **Use default settings** (click "Next" through all steps)
5. **Restart your computer** after installation

#### **For macOS:**
1. **Open Terminal**
2. **Type**: `git --version`
3. **If Git is not installed**, you'll be prompted to install it
4. **Follow the prompts** to install

#### **For Linux:**
```bash
# Open terminal and run:
sudo apt-get update
sudo apt-get install git
```

### **Verify Installation:**
1. **Open Command Prompt** (Windows) or **Terminal** (Mac/Linux)
2. **Type**: `git --version`
3. **Press Enter**
4. **You should see** something like `git version 2.40.0`

---

## 📁 **Step 3: Download the Vibemap Code**

### **Method 1: Using Git (Recommended)**

1. **Open Command Prompt** (Windows) or **Terminal** (Mac/Linux)
2. **Navigate to where you want to store the project**:
   ```bash
   # For Windows (example):
   cd C:\Users\YourName\Desktop
   
   # For Mac/Linux (example):
   cd ~/Desktop
   ```
3. **Download the code**:
   ```bash
   git clone https://github.com/PolygonSol/vibemap.git
   ```
4. **Navigate into the project folder**:
   ```bash
   cd vibemap
   ```

### **Method 2: Download as ZIP (Alternative)**

1. **Go to**: https://github.com/PolygonSol/vibemap
2. **Click the green "Code" button**
3. **Select "Download ZIP"**
4. **Extract the ZIP file** to your desired location
5. **Open Command Prompt/Terminal** and navigate to the extracted folder

---

## 📦 **Step 4: Install Dependencies**

### **What are Dependencies?**
Dependencies are like the ingredients needed to make the Vibemap application work. They're additional pieces of code that the application needs to function.

### **Installation:**
1. **Make sure you're in the vibemap folder** in your Command Prompt/Terminal
2. **Run this command**:
   ```bash
   npm install
   ```
3. **Wait for it to complete** (this may take 2-5 minutes)
4. **You'll see a progress bar** and lots of text scrolling
5. **When it's done**, you'll see your command prompt again

### **What's Happening:**
- npm (Node Package Manager) is downloading all the required libraries
- It's creating a `node_modules` folder with all the dependencies
- It's setting up the project configuration

---

## 🚀 **Step 5: Start the Development Server**

### **What is a Development Server?**
A development server is like a mini-website that runs on your computer. It's where you can see and test the Vibemap application locally.

### **Starting the Server:**
1. **Make sure you're in the vibemap folder** in your Command Prompt/Terminal
2. **Run this command**:
   ```bash
   npm start
   ```
3. **Wait a moment** (you'll see some text scrolling)
4. **Your web browser will automatically open** to `http://localhost:3000`
5. **You should see the Vibemap application** running in your browser!

### **What You Should See:**
- The Vibemap interface with the map
- Layer controls on the right
- Toolbar with buttons (Filter, Draw Select, etc.)
- The 1990s-style visitor counter at the bottom

---

## 🛑 **Step 6: Stopping the Server**

### **When You're Done:**
1. **Go back to your Command Prompt/Terminal**
2. **Press** `Ctrl + C` (Windows/Linux) or `Cmd + C` (Mac)
3. **Type** `Y` and press Enter if prompted
4. **The server will stop** and you'll see your command prompt again

---

## 🔧 **Troubleshooting Common Issues**

### **Issue 1: "Node is not recognized"**
**Solution**: Node.js isn't installed or needs a restart
1. **Restart your computer**
2. **Try the installation again**

### **Issue 2: "Git is not recognized"**
**Solution**: Git isn't installed or needs a restart
1. **Restart your computer**
2. **Try the installation again**

### **Issue 3: "npm install" fails**
**Solution**: Try these steps:
1. **Check your internet connection**
2. **Try again**: `npm install`
3. **If it still fails**, try: `npm cache clean --force` then `npm install`

### **Issue 4: "Port 3000 is already in use"**
**Solution**: Something else is using that port
1. **Press** `Y` when prompted to use a different port
2. **Or stop other applications** that might be using port 3000

### **Issue 5: Browser doesn't open automatically**
**Solution**: Manually open your browser
1. **Go to**: `http://localhost:3000`
2. **You should see the Vibemap application**

---

## 📚 **Understanding the Project Structure**

Once you have the project set up, here's what the folders contain:

```
vibemap/
├── 📁 src/           # The main application code
├── 📁 public/        # Static files (images, HTML template)
├── 📄 package.json   # Project configuration and dependencies
├── 📄 README.md      # Project documentation
└── 📄 .gitignore     # Files to ignore in version control
```

### **Key Files Explained:**
- **`src/App.js`**: The main application code (4,000+ lines!)
- **`src/App.css`**: Styling for the application
- **`public/index.html`**: The HTML template
- **`package.json`**: Lists all the dependencies and scripts

---

## 🎯 **Next Steps - What You Can Do Now**

### **1. Explore the Application**
- **Try all the tools**: Filter, Draw Select, Line Measure, Area Measure
- **Toggle layers**: Turn bridges, roads, conduits on/off
- **Interact with the map**: Zoom, pan, click on features

### **2. Make Simple Changes**
- **Edit text**: Open `src/App.js` in a text editor
- **Change colors**: Modify `src/App.css`
- **Update the title**: Look for "Vibe Map - Polygon Solutions"

### **3. Learn More**
- **Read the code**: Start with `src/App.js` (it's well-commented)
- **Experiment**: Make small changes and see what happens
- **Ask questions**: Use the GitHub repository to ask questions

---

## 🆘 **Getting Help**

### **If Something Goes Wrong:**
1. **Check the error messages** in your Command Prompt/Terminal
2. **Try restarting** the development server (`Ctrl+C`, then `npm start`)
3. **Check your internet connection**
4. **Restart your computer** if needed

### **Where to Get Help:**
- **GitHub Issues**: https://github.com/PolygonSol/vibemap/issues
- **Documentation**: Check the `README.md` file
- **Online Resources**: Search for "React development setup" or "Node.js installation"

---

## 🎉 **Congratulations!**

You've successfully set up your own local development environment for Vibemap! You now have:

✅ **Node.js** installed and running  
✅ **Git** for code management  
✅ **Vibemap code** downloaded to your computer  
✅ **Dependencies** installed  
✅ **Development server** running  
✅ **Application** accessible in your browser  

### **What This Means:**
- You can now make changes to the code and see them immediately
- You can experiment without affecting the live website
- You can learn how the application works from the inside
- You can contribute to the project if you want to

### **Remember:**
- **Always stop the server** (`Ctrl+C`) when you're done
- **Keep your Node.js and Git updated**
- **Don't be afraid to experiment** - you can always reinstall if needed

---

**Happy coding! 🚀**

*If you have any questions or run into issues, don't hesitate to ask for help. Every developer started exactly where you are now!* 