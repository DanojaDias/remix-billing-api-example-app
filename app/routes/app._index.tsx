import { useEffect, useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit,  } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  Toast,
  Frame
} from "@shopify/polaris";
import { authenticate, MONTHLY_PLAN } from "../shopify.server";

//////////////////
import { Form } from "@remix-run/react"
import { redirect } from "@remix-run/node";
//////////////////

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {

  let { _action } = Object.fromEntries(await request.formData());
  const { billing } = await authenticate.admin(request);
   
  if (_action === "startSubscription") {    
    await billing.require({
      plans: [MONTHLY_PLAN],
      onFailure: async () => {
        const response = await billing.request({
          plan: MONTHLY_PLAN,
          isTest: true,
          returnUrl: "",
        })
        return response;
      },
    });
    return json({ alreadySubscribed: true });
  }
  else if (_action === "cancelSubscription") {
    const billingCheck = await billing.require({
      plans: [MONTHLY_PLAN],
      onFailure: async () => billing.request({ plan: MONTHLY_PLAN }),
    });

    const subscription = billingCheck.appSubscriptions[0];
    const cancelledSubscription = await billing.cancel({
      subscriptionId: subscription.id,
      isTest: false,
      prorate: true,
    });
    return json({ subscriptionCancelled: true });
  }
  return redirect("/app");
};

export default function Index() {
  
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [subscriptionCancelled, setSubscriptionCancelled] = useState(false);
  const actionData = useActionData<typeof action>();

  useEffect(() => {
    if (actionData?.alreadySubscribed) {
      setAlreadySubscribed(actionData?.alreadySubscribed);
    }
    if (actionData?.subscriptionCancelled) {
      setSubscriptionCancelled(actionData?.subscriptionCancelled);
    }
  }, [actionData])

  const toggleActive = 
    useCallback(() => {
      setSubscriptionCancelled(false);
      setAlreadySubscribed(false);                              
    }, []);

  return (
    <Page>
      <ui-title-bar title="Pricing Plan" />
      <Layout>
        <Layout.Section>
          <Card>
              <Form method="post" >
                <Text as="h1" variant="headingMd" alignment="center">
                  Starter
                </Text>
                <List type="bullet">
                  <List.Item>Ideal for early stage stores.</List.Item>
                </List>
                <br/>
                <button type="submit" name="_action" value="startSubscription">Start Subscription</button>
                <br/>
                <br/>
                <button type="submit" name="_action" value="cancelSubscription">Cancel Subscription</button>
              </Form>
          </Card>
          <Frame>
          {alreadySubscribed ? (
              <Toast content="You have already subscribed." onDismiss={toggleActive}/>
          ) : null}
          {subscriptionCancelled ? (
              <Toast content="Subcription Cancelled." onDismiss={toggleActive}/>
          ) : null}
          </Frame>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
