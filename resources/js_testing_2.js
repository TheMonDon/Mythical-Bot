/* eslint-disable no-undef */
// Vote Command
(() => {
  if (db.get(`servers.${server.id}.users.${member.id}.blacklist`)) return msg.channel.send(`Sorry ${member.displayName}, You're currently blacklisted from using the bot in this server!`)
  db.add('global.commands', 1)
  const em = new DiscordJS.MessageEmbed()
    .setTitle('Crafters-Island Voting')
    .setColor('#248cc6')
    .setDescription('You can get the vote links by going to our website here: https://www.crafters-island.com/vote/')
    .setAuthor(member.displayName, msg.author.displayAvatarURL())
  msg.channel.send(em)
})()
