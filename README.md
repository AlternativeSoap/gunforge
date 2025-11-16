# 🎮 Gunforge: Wasteland Echoes

A post-apocalyptic roguelike shooter built with pure HTML5/JavaScript.

## 🕹️ Play Online

**[Play Now](https://alternativesoap.github.io/gunforge/gunforge/)**

## 🎯 Features

- **Roguelike Gameplay** - Procedurally generated dungeons, permadeath
- **Skill Tree** - Unlock permanent upgrades between runs
- **Multiple Difficulties** - Easy, Medium, Hard, Nightmare
- **Boss Fights** - Unique boss variants with special abilities
- **Weapon System** - Various weapons with different mechanics
- **Themed Rooms** - Dark chambers, toxic labs, frozen vaults, explosive armories
- **Local Multiplayer Ready** - Designed for keyboard + mouse

## 🎮 Controls

- **WASD** - Move
- **Mouse** - Aim & Shoot
- **Shift** - Dash
- **E** - Interact
- **R** - Swap Weapon
- **M** - Map
- **ESC** - Pause

## 🚀 Running Locally

1. Clone the repository:
```bash
git clone https://github.com/AlternativeSoap/gunforge.git
cd gunforge
```

2. Start a local server (any of these work):
```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server

# VS Code Live Server
# Right-click gunforge/index.html → Open with Live Server
```

3. Open in browser:
```
http://localhost:8000/gunforge/
```

**Note:** The game uses ES6 modules and must be run via HTTP, not `file://`

## 📂 Project Structure

```
gunforge/
├── index.html          # Main entry point
├── style.css          # Game styles
├── assets/            # Images, sounds, music
│   ├── img/          # Sprites and icons
│   ├── sfx/          # Sound effects
│   └── music/        # Background music
└── js/               # Game logic
    ├── main.js       # Core game loop
    ├── player.js     # Player mechanics
    ├── enemy.js      # Enemy AI
    ├── data.js       # Game configuration
    └── ...more
```

## 🎨 Credits

Built by [AlternativeSoap](https://github.com/AlternativeSoap)

## 📜 License

MIT License - Feel free to modify and share!

---

**Enjoy the wasteland! 🔫💀**
