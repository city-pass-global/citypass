extern crate std;
use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

#[test]
fn purchase_replay_and_tiers() {
    let env = Env::default();
    env.mock_all_auths();
    let issuer = Address::generate(&env);
    let user = Address::generate(&env);
    let id = env.register(PassportActivity, (issuer.clone(),));
    let client = PassportActivityClient::new(&env, &id);
    client.register(&user);
    assert_eq!(env.auths()[0].0, issuer);
    for i in 1..=3u8 {
        let event = BytesN::from_array(&env, &[i; 32]);
        let record = Record {
            user: user.clone(),
            destination: event.clone(),
            subject: event.clone(),
            kind: 1,
        };
        assert_eq!(client.record(&event, &record).reputation, u64::from(i) * 80);
        assert_eq!(env.auths()[0].0, issuer);
        assert_eq!(client.record(&event, &record).reputation, u64::from(i) * 80);
    }
    assert_eq!(client.tier(&user), 2);
    let stamp = BytesN::from_array(&env, &[8; 32]);
    let record = Record {
        user: user.clone(),
        destination: stamp.clone(),
        subject: stamp.clone(),
        kind: 2,
    };
    assert_eq!(client.record(&stamp, &record).stamps, 1);
    assert_eq!(client.record(&stamp, &record).reputation, 240);
    let duplicate = BytesN::from_array(&env, &[9; 32]);
    assert_eq!(
        client.try_record(&duplicate, &record),
        Err(Ok(Error::AlreadyCollected))
    );
    assert_eq!(
        client.try_record(&stamp, &Record { kind: 1, ..record }),
        Err(Ok(Error::Conflict))
    );
    client.set_paused(&true);
    assert_eq!(
        client.try_record(
            &duplicate,
            &Record {
                user,
                destination: duplicate.clone(),
                subject: duplicate.clone(),
                kind: 1
            }
        ),
        Err(Ok(Error::Paused))
    );
}

#[test]
fn unauthorized_issuer_and_activation_are_denied() {
    let env = Env::default();
    let issuer = Address::generate(&env);
    let user = Address::generate(&env);
    let id = env.register(PassportActivity, (issuer,));
    let client = PassportActivityClient::new(&env, &id);
    assert!(client.try_register(&user).is_err());
    let event = BytesN::from_array(&env, &[1; 32]);
    assert!(client
        .try_record(
            &event,
            &Record {
                user,
                destination: event.clone(),
                subject: event.clone(),
                kind: 1
            }
        )
        .is_err());
    assert!(client.try_set_paused(&true).is_err());
}

#[test]
fn duplicate_subjects_and_inactive_wallets_cannot_farm_activity() {
    let env = Env::default();
    env.mock_all_auths();
    let issuer = Address::generate(&env);
    let user = Address::generate(&env);
    let id = env.register(PassportActivity, (issuer,));
    let client = PassportActivityClient::new(&env, &id);
    let event = BytesN::from_array(&env, &[1; 32]);
    let next = BytesN::from_array(&env, &[2; 32]);
    let mut record = Record {
        user: user.clone(),
        destination: event.clone(),
        subject: event.clone(),
        kind: 1,
    };
    assert_eq!(client.record(&event, &record).reputation, 80);
    client.register(&user);
    assert_eq!(client.tier(&user), 1);
    client.record(&event, &record);
    assert_eq!(client.tier(&user), 1);
    assert_eq!(
        client.try_record(&next, &record),
        Err(Ok(Error::AlreadyCollected))
    );
    client.register(&user);
    assert_eq!(client.activity(&user).unwrap().reputation, 80);
    record.kind = 3;
    assert_eq!(client.record(&next, &record).redemptions, 1);
    let third = BytesN::from_array(&env, &[3; 32]);
    assert_eq!(
        client.try_record(&third, &record),
        Err(Ok(Error::AlreadyCollected))
    );
    record.kind = 99;
    assert_eq!(
        client.try_record(&third, &record),
        Err(Ok(Error::InvalidKind))
    );
}

#[test]
fn issuer_rotation_and_event_recovery() {
    let env = Env::default();
    let issuer = Address::generate(&env);
    let replacement = Address::generate(&env);
    let user = Address::generate(&env);
    let id = env.register(PassportActivity, (issuer.clone(),));
    let client = PassportActivityClient::new(&env, &id);
    assert_eq!(client.issuer(), issuer);
    assert!(client.try_set_issuer(&replacement).is_err());
    env.mock_all_auths();
    client.set_issuer(&replacement);
    assert_eq!(env.auths()[0].0, issuer);
    assert_eq!(client.issuer(), replacement);
    client.register(&user);
    let event = BytesN::from_array(&env, &[7; 32]);
    assert_eq!(client.event(&event), None);
    let record = Record {
        user: user.clone(),
        destination: event.clone(),
        subject: event.clone(),
        kind: 1,
    };
    client.record(&event, &record);
    assert_eq!(env.auths()[0].0, replacement);
    assert_eq!(client.event(&event), Some(record.clone()));
    assert_eq!(client.record(&event, &record).purchases, 1);
    assert_eq!(client.activity(&user).unwrap().reputation, 80);
}

#[test]
fn service_acquisitions_and_self_reported_stamps_have_separate_awards() {
    let env = Env::default();
    env.mock_all_auths();
    let issuer = Address::generate(&env);
    let user = Address::generate(&env);
    let id = env.register(PassportActivity, (issuer,));
    let client = PassportActivityClient::new(&env, &id);
    let destination = BytesN::from_array(&env, &[1; 32]);
    for i in 2..=3u8 {
        let event = BytesN::from_array(&env, &[i; 32]);
        let record = Record {
            user: user.clone(),
            destination: destination.clone(),
            subject: event.clone(),
            kind: 4,
        };
        let activity = client.record(&event, &record);
        assert_eq!(activity.purchases, u32::from(i) - 1);
        assert_eq!(activity.stamps, u32::from(i) - 1);
        assert_eq!(activity.reputation, (u64::from(i) - 1) * 80);
        assert_eq!(client.record(&event, &record), activity);
        let duplicate = BytesN::from_array(&env, &[i + 10; 32]);
        assert_eq!(
            client.try_record(&duplicate, &record),
            Err(Ok(Error::AlreadyCollected))
        );
    }
    let event = BytesN::from_array(&env, &[5; 32]);
    let record = Record {
        user: user.clone(),
        destination,
        subject: event.clone(),
        kind: 5,
    };
    let activity = client.record(&event, &record);
    assert_eq!(activity.stamps, 3);
    assert_eq!(activity.exploration_stamps, 1);
    assert_eq!(activity.reputation, 160);
    assert_eq!(client.record(&event, &record), activity);
    let duplicate = BytesN::from_array(&env, &[6; 32]);
    assert_eq!(
        client.try_record(&duplicate, &record),
        Err(Ok(Error::AlreadyCollected))
    );
}
