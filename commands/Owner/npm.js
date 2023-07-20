const Command = require('../../base/Command.js');
const child = require('child_process');

class NPM extends Command {
  constructor(client) {
    super(client, {
      name: 'npm',
      category: 'Owner',
      permLevel: 'Bot Owner',
      description: 'Installs an NPM package and saves it to the package.json',
    });
  }

  async run(msg, args) {
    const moduleName = args.join(' ');
    const message = await msg.channel.send(`Attempting to install Node Module: ${moduleName}`);

    try {
      require.resolve(moduleName);
      return message.edit(`The Node Module ${moduleName} is already installed.`);
    } catch (notinstalled) {
      try {
        await message.edit(`Installing Node Module: ${moduleName}`);
        child.execSync(`npm install ${moduleName} --save`, { stdio: 'inherit' });
        require.resolve(moduleName);
      } catch (error) {
        console.error(error);
        return message.edit(`The Node Module ${moduleName} was probably installed, but too big to require without restarting.`);
      }
    }
    return message.edit(`The Node Module ${moduleName} was successfully installed!`);
  }
}

module.exports = NPM;
