const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');

class Nickname extends Command {
  constructor (client) {
    super(client, {
      name: 'nickname',
      description: 'Change the nickname of a member',
      usage: 'nickname',
      category: 'Moderator',
      aliases: ['nick'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    if (!msg.member.permissions.has('ManageNicknames')) return msg.channel.send('You are missing the manage nicknames permission.');
    if (!msg.guild.members.me.permissions.has('ManageNicknames')) return msg.channel.send('The bot doesn\'t have manage nicknames permission.');

    if (!text[0]) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Nick <user> (nickname)`);

    const infoMem = getMember(msg, text[0]);
    const owner = msg.guild.fetchOwner();

    if (!infoMem) return msg.channel.send('Please supply a proper member.');
    if (infoMem.id === owner.user.id) return msg.channel.send('Only the server owner of the server can change their nickname.');
    if (infoMem.roles.highest.position > msg.guild.members.me.roles.highest.position - 1) return msg.channel.send('I need my role higher to change that users nickname.');

    text.shift();
    const nick = text.join(' ');
    if (nick) {
      const oldNick = infoMem.nickname || infoMem.user.username;
      infoMem.setNickname(nick);
      return msg.channel.send(`Changed old nickname \`${oldNick}\` to \`${nick}\``);
    }

    infoMem.setNickname(infoMem.user.username);
    return msg.channel.send(`Reset the nickname of ${infoMem.user.username}`);
  }
}

module.exports = Nickname;
