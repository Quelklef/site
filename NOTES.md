
# [2022-05-30] Fix: deploy failing after domain removal

Issue: I did not renew ownership of a domain, and now my deployment is failing with an error something like this:

```
frigate> May 30 07:27:10 frigate acme-maynards.site-start[32638]: 2022/05/30 07:27:10 [INFO] Deactivating auth: https://acme-v02.api.letsencrypt.org/acme/authz-v3/<some-auth>
frigate> May 30 07:27:11 frigate acme-maynards.site-start[32638]: 2022/05/30 07:27:11 error: one or more domains had a problem:
frigate> May 30 07:27:11 frigate acme-maynards.site-start[32638]: [<some-domain.com>] acme: error: 400 :: urn:ietf:params:acme:error:dns :: DNS problem: NXDOMAIN looking up A for <some-domain.com> - check that a DNS record exists for this domain; DNS problem: NXDOMAIN looking up AAAA for <some-domain.com> - check that a DNS record exists for this domain
```

Resolution: ssh in and run

```
systemctl stop acme-maynards.site
  # ^ stop service
systemctl reset-failed acme-maynards.site
  # ^ mark as Inactive instead of Failed so we can run 'systemctl clean'
systemctl clean --what=state acme-maynards.site
  # ^ clear local state/cache?
systemctl start acme-maynards.site
  # ^ with cache gone, handle the certs afresh
```

My (very vague) understanding of the issue is this. The no-longer-owned domain was on the same certificate as the rest of them. When deploying, certificates are checked/renewed/updated as necessary. Since the no-longer-owned domain was on the same cert, an attempt was made to renew it. This attempt failed. The above bash commands force a "cleaner" renewal, which fixes the issue.
