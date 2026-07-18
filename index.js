const {
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
    StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, PermissionFlagsBits, ModalBuilder,
    TextInputBuilder, TextInputStyle
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const SALON_PUB_ID = "1527472732890075206";
const SALON_RESEAUX_ID = "1527477134145224814";
const ROLES_AUTORISES = ["1526625483138269244", "1526720313952436334", "1526720034330775653", "1527500185251348520", "152662404745318001"];

const MESSAGE_RAPPEL = "✒️ **Votre publicité doit respecter les Therms Of Service de discord ainsi que le règlement du serveur.**\n\n📝 **Votre publicité doit contenir une description, est un lien discord menant a un serveur.**\n\n🔞 **Si votre publicité contient du nswf ou autres qui contredit ou est interdit par les chartes discord sera automatiquement enlever puis sanctionner au niveau de la personnes.**\n\n⚠️ **Si vous quittez le serveur, vos publicités seront automatiquement supprimés.**\n\n*Merci de votre compréhension et bonne journée/soirée.*";

client.once('ready', () => {
    console.log(`✅ Le bot est en ligne ! Connecté en tant que : ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channel.id === SALON_PUB_ID || message.channel.id === SALON_RESEAUX_ID) {
        const contientLien = message.content.includes("http") || message.content.includes("discord.gg") || message.attachments.size > 0;

        if (contientLien) {
            setTimeout(async () => {
                const embed = new EmbedBuilder()
                    .setTitle('📢 RAPPEL RÈGLEMENT')
                    .setDescription(MESSAGE_RAPPEL)
                    .setColor('#FF0000')
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] }).catch(() => {});
            }, 500);
        }
    }

    if (message.content === '!setup-ticket') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const embed = new EmbedBuilder()
            .setTitle('📩 SUPPORT TECHNIQUE & AIDE')
            .setDescription('Bienvenue sur le support de LOKIA.\n\nMerci de rester poli et courtois lorsque vous ouvrez un ticket.\nNotre équipe est disponible pour répondre à vos besoins.\n\n**Choisissez l\'option qui correspond à votre demande ci-dessous :**')
            .setColor('#5865F2')
            .setFooter({ text: 'Système de ticket automatisé' });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('menu_ticket')
            .setPlaceholder('Sélectionnez le motif de votre ticket...')
            .addOptions([
                { label: 'Contactez le staff', value: 'staff', description: 'Option 1 : Parler à un modérateur ou administrateur', emoji: '🔰' },
                { label: 'Partenariat & Collab', value: 'partenariat', description: 'Option 2 : Proposer une collaboration', emoji: '🤝' },
                { label: 'Signalements', value: 'signalement', description: 'Option 3 : Signaler un joueur ou un problème', emoji: '❗' },
                { label: 'Question', value: 'question', description: 'Option 4 : Poser une question générale', emoji: '❓' },
                { label: 'Passage Prioritaire', value: 'prioritaire', description: 'Option 5 : Demande urgente', emoji: '😎' }
            ]);

        await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
        await message.delete().catch(() => {});
    }
});

client.on('interactionCreate', async (i) => {
    if (i.isStringSelectMenu() && i.customId === 'menu_ticket') {
        const typeTicket = i.values[0];

        const channel = await i.guild.channels.create({
            name: `🎫-${typeTicket}-${i.user.username}`,
            type: ChannelType.GuildText,
            topic: i.user.id,
            permissionOverwrites: [
                { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        await i.reply({ content: `✅ Votre ticket a été créé ici : ${channel}`, flags: [64] });

        const embedTicket = new EmbedBuilder()
            .setTitle(`🎫 SUPPORT OUVERT - ${typeTicket.toUpperCase()}`)
            .setDescription(`Bonjour ${i.user},\n\nMerci d'avoir contacté le staff pour le motif : **${typeTicket}**.\nExpliquez en détail votre demande. Un membre de l'équipe va vous prendre en charge.\n\n⚠️ **Rappel :** Tout manque de respect envers le staff sera lourdement sanctionné.`)
            .setColor('#5865F2')
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fermer_ticket').setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `${i.user}`, embeds: [embedTicket], components: [row] });
    }

    if (i.isButton() && i.customId === 'fermer_ticket') {
        const aLeRole = i.member.roles.cache.some(r => ROLES_AUTORISES.includes(r.id));
        const estAdmin = i.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!aLeRole && !estAdmin) {
            return i.reply({ content: "❌ Seuls les membres du staff autorisés peuvent fermer ce ticket.", flags: [64] });
        }

        const modal = new ModalBuilder().setCustomId('modal_motif').setTitle('Fermeture du ticket');
        const input = new TextInputBuilder()
            .setCustomId('motif_texte')
            .setLabel('Indiquez le motif de la fermeture :')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Ex: Problème résolu...');

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === 'modal_motif') {
        const motif = i.fields.getTextInputValue('motif_texte');
        const creatorId = i.channel.topic;

        await i.reply({ content: "🔒 Fermeture et enregistrement des logs en cours...", flags: [64] });

        const fetchMessages = await i.channel.messages.fetch({ limit: 100 });
        const messagesTries = fetchMessages.reverse();

        let texteLogs = `=== HISTORIQUE DU TICKET : ${i.channel.name} ===\nFermé par : ${i.user.tag}\nMotif : ${motif}\n==============================================\n\n`;

        messagesTries.forEach(m => {
            if (!m.author.bot) {
                texteLogs += `[${m.createdAt.toLocaleTimeString('fr-FR')}] ${m.author.tag}: ${m.content}\n`;
            }
        });

        if (creatorId) {
            try {
                const membreCreateur = await i.guild.members.fetch(creatorId);
                await membreCreateur.send(`📜 **Compte-rendu de la fermeture de votre ticket**\n\n**Salon :** \`${i.channel.name}\`\n**Fermé par :** ${i.user}\n**Motif :** \`${motif}\`\n\n**__Historique des messages :__**\n\`\`\`text\n${texteLogs.slice(0, 1500)}\n\`\`\``);
            } catch (e) {
                console.log("Impossible d'envoyer le MP");
            }
        }

        setTimeout(() => {
            i.channel.delete().catch(() => {});
        }, 3000);
    }
});

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Lokia Bot est en ligne et réveillé !');
});

app.listen(port, () => {
  console.log(`Serveur de secours en cours d'exécution sur le port ${port}`);


// 1. DÉCLENCHEMENT DE LA COMMANDE EXACTE
client.on('messageCreate', async (message) => {
  // On vérifie le nom exact de ta commande
  if (message.content === '!contester-une-décision') {
    
    // Optionnel : On supprime le message sur le serveur pour la discrétion
    if (message.guild) {
      try { await message.delete(); } catch (e) { console.log("Impossible de supprimer le message"); }
    }

    try {
      // Configuration des 3 options avec tes textes exacts
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('opt_rien')
          .setLabel('Option 1 : On m\'a banni Pour Rien')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('opt_mute')
          .setLabel('Option 2 : Je voudrais me faire mute du chat')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('opt_sanction')
          .setLabel('Option 3 : On m\'a mis une sanction pour rien')
          .setStyle(ButtonStyle.Secondary)
      );

      // Envoi du message en MP à l'utilisateur
      await message.author.send({
        content: "👋 **Bienvenue dans le système de contestation de Lokia.**\nChoisis l'option qui correspond à ta situation ci-dessous :",
        components: [row]
      });

    } catch (error) {
      // Si ses MP sont fermés, on le prévient discrètement sur le serveur
      const alert = await message.channel.send(`❌ <@${message.author.id}>, je ne peux pas t'envoyer de message privé. Active tes MP dans tes paramètres de sécurité !`);
      setTimeout(() => alert.delete().catch(() => {}), 5000); // Supprime l'alerte après 5 secondes
    }
  }
});

// 2. GESTION DES BOUTONS ET DU FORMULAIRE (MODAL)
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton() && interaction.customId.startsWith('opt_')) {
    
    let typeContestation = "";
    if (interaction.customId === 'opt_rien') typeContestation = "On m'a banni Pour Rien";
    if (interaction.customId === 'opt_mute') typeContestation = "Je voudrais me faire mute du chat";
    if (interaction.customId === 'opt_sanction') typeContestation = "On m'a mis une sanction pour rien";

    // Création du formulaire pop-up
    const modal = new ModalBuilder()
      .setCustomId(`formulaire_${interaction.customId}`)
      .setTitle('Formulaire de contestation');

    // Champ 1 : Par qui ?
    const staffInput = new TextInputBuilder()
      .setCustomId('form_staff')
      .setLabel("Par qui as-tu été sanctionné(e) ?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Pseudo du modérateur ou de l'administrateur")
      .setRequired(true);

    // Champ 2 : Pourquoi / Explications
    const raisonInput = new TextInputBuilder()
      .setCustomId('form_raison')
      .setLabel("Pourquoi contestes-tu ? (Explications)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Raconte précisément ce qu'il s'est passé...")
      .setRequired(true);

    const actionStaff = new ActionRowBuilder().addComponents(staffInput);
    const actionRaison = new ActionRowBuilder().addComponents(raisonInput);
    modal.addComponents(actionStaff, actionRaison);

    await interaction.showModal(modal);
  }

  // 3. ENVOI AUX FONDATEURS LORSQUE LE FORMULAIRE EST VALIDÉ
  if (interaction.isModalSubmit() && interaction.customId.startsWith('formulaire_')) {
    const staff = interaction.fields.getTextInputValue('form_staff');
    const raison = interaction.fields.getTextInputValue('form_raison');
    
    let typeFinal = "Inconnu";
    if (interaction.customId.includes('opt_rien')) typeFinal = "Option 1 : On m'a banni Pour Rien";
    if (interaction.customId.includes('opt_mute')) typeFinal = "Option 2 : Je voudrais me faire mute du chat";
    if (interaction.customId.includes('opt_sanction')) typeFinal = "Option 3 : On m'a mis une sanction pour rien";

    // Création du récapitulatif pour les fondateurs
    const embedFormulaire = new EmbedBuilder()
      .setColor('#00ffaa')
      .setTitle('📥 Nouvelle contestation reçue !')
      .addFields(
        { name: 'Membre :', value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: 'Option choisie :', value: typeFinal },
        { name: 'Sanctionné par :', value: staff },
        { name: 'Explications du membre :', value: raison }
      )
      .setTimestamp();

    // 🛑 AJOUTE LES VRAIS ID DES DEUX FONDATEURS ICI
    const idFondateurs = ['1254877636799238257', '1526683922677629008'];

    for (const id of idFondateurs) {
      try {
        const fondateur = await client.users.fetch(id);
        await fondateur.send({ embeds: [embedFormulaire] });
      } catch (e) {
        console.log(`Impossible d'envoyer le MP au fondateur ${id}`);
      }
    }

    await interaction.reply({ 
      content: "✅ Ton mini-formulaire a bien été envoyé aux deux fondateurs. Merci !", 
      ephemeral: true 
    });
  }
});

client.login(process.env.TOKEN);
                  
