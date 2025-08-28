// updateCommandTypes.js
const fs = require('fs');
const path = require('path');

const commandDir = path.join(__dirname, './src/slashCommands');
const typeMap = {
  STRING: 'ApplicationCommandOptionType.String',
  INTEGER: 'ApplicationCommandOptionType.Integer',
  BOOLEAN: 'ApplicationCommandOptionType.Boolean',
  USER: 'ApplicationCommandOptionType.User',
  CHANNEL: 'ApplicationCommandOptionType.Channel',
  ROLE: 'ApplicationCommandOptionType.Role',
  MENTIONABLE: 'ApplicationCommandOptionType.Mentionable',
  NUMBER: 'ApplicationCommandOptionType.Number',
  ATTACHMENT: 'ApplicationCommandOptionType.Attachment'
};

function updateTypes(dir) {
  const folders = fs.readdirSync(dir);

  folders.forEach(folder => {
    const folderPath = path.join(dir, folder);
    if (!fs.statSync(folderPath).isDirectory()) return;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));

    files.forEach(file => {
      const filePath = path.join(folderPath, file);
      let content = fs.readFileSync(filePath, 'utf8');

      let changed = false;
      for (const oldType in typeMap) {
        const regex = new RegExp(`type:\\s*["']?${oldType}["']?`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, `type: ${typeMap[oldType]}`);
          changed = true;
        }
      }

      if (changed) {
        // Pastikan import ApplicationCommandOptionType
        if (!/ApplicationCommandOptionType/.test(content)) {
          content = `const { ApplicationCommandOptionType } = require('discord.js');\n` + content;
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated types in ${filePath}`);
      }
    });
  });
}

updateTypes(commandDir);
console.log('All slash command types updated!');
