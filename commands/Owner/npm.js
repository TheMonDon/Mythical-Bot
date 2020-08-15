const Command = require('../../base/Command.js');
const child = require('child_process');
const { stripIndents } = require('common-tags');

module.exports = class NPM extends Command {
  constructor (client) {
    super(client, {
      name: 'npm',
      category: 'Owner',
      memberName: 'npm',
      description: 'Installs an NPM package and saves it to the package.json',
      details: stripIndents`(Owner Only) It will install an npm package, 
				save the package to the package.json and all its dependencies.`,
      permLevel: 'Bot Owner'
    });
  }

  async run (msg, args) {
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
        return message.edit(stripIndents`The Node Module ${moduleName} was not Installed. 
				An error was encountered, the module probably doesn't exist in the registry!`);
      }
    }
    return message.edit(`The Node Module ${moduleName} was successfully installed!`);
  }
};
