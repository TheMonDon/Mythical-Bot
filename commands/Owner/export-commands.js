const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

class ExportCommands extends Command {
  constructor(client) {
    super(client, {
      name: 'export-commands',
      description: 'Exports all commands to a JSON file.',
      category: 'General',
      usage: 'export-commands',
      examples: ['exportcommands'],
      aliases: ['exportcmds', 'exportjson'],
    });
  }

  async run(msg, args, level) {
    const allCommands = this.client.commands;
    const commandData = {};

    allCommands.forEach((cmd) => {
      const category = cmd.help.category || 'Unknown';
      const cmdName = cmd.help.name;

      if (!commandData[category]) {
        commandData[category] = {};
      }

      commandData[category][cmdName] = {
        description: cmd.help.description,
        usage: cmd.help.usage,
        examples: cmd.help.examples,
        aliases: cmd.conf.aliases,
        permissionLevel: cmd.conf.permLevel,
        guildOnly: cmd.conf.guildOnly,
        nsfw: cmd.conf.nsfw,
        longDescription: cmd.help.longDescription || 'None',
      };
    });

    const jsonFilePath = './commands.json';
    fs.writeFileSync(jsonFilePath, JSON.stringify(commandData, null, 2), 'utf-8');

    const embed = new EmbedBuilder()
      .setTitle('Commands Exported')
      .setDescription(`All commands have been exported to \`${jsonFilePath}\``)
      .setColor('#00FF00');

    msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ExportCommands;
