/*
profile = "booking/list-activities@1.0"
provider = "bokun"

map ListActivities {
  LIMIT = 25

  // https://bokun.helpkit.so/api/uzi4nXgs2wN1DhxkkLHves/graphql-reference/vR2B5njQj3zPmZkSsHU8D8
  http POST "/api/graphql" {
    security "accessToken"

    request "application/json" {
      body {
        query = "
          query Experiences($nextPage: String, $limit: Int!) {
            experiences(after: $nextPage, first: $limit) {
              edges {
                node {
                  id
                  name
                  briefDescription
                  description
                  categories
                  keywords
                  themes
                  images {
                    caption
                    originalUrl
                    thumbnailUrl
                    previewUrl
                  }
                  videos {
                    name
                    sourceUrl
                    thumbnailUrl
                    previewUrl
                  }
                }
              }
              pageInfo {
                endCursor
                hasPreviousPage
              }
              totalCount
            }
          }
        "

        variables = {
          nextPage: input.page,
          limit: LIMIT
        }
      }
    }

    response 200 "application/json" {
      unauthorized_error = (() => {
        let err = (body.errors || []).find((err) => err.extensions && err.extensions.classification && err.extensions.classification === 'UnauthorizedError');
        if (err) {
          return err.message;
        }
      })();

      return map error if (unauthorized_error) {
        title = "Unauthorized Error"
        detail = unauthorized_error
      }

      return map error if (body.errors) {
        title = "Unknown error"
        detail = JSON.stringify(body.errors, 2)
      }

      return map result {
        activities = body.data.experiences.edges.map((edge) => {
          const activity = edge.node;
          return {
            id: activity.id,
            name: activity.name,
            description: activity.description,
            shortDescription: activity.briefDescription,
            images: activity.images.map((image) => {
              return {
                url: image.originalUrl,
                thumbnailUrl: image.previewUrl || image.thumbnailUrl,
                caption: image.caption
              }
            }),
            videos: activity.videos.map((video) => {
              return {
                url: video.sourceUrl,
                thumbnailUrl: video.previewUrl || video.thumbnailUrl,
                caption: video.name
              }
            }),
            tags: [].concat(activity.categories, activity.themes, activity.keywords),
            customFields: []
          }
        }),
        nextPage = body.data.experiences.pageInfo.endCursor
        total = body.data.experiences.totalCount
      }
    }
  }
}
*/

use map::{http_request, object, HttpRequestError, StructuredValue, StructuredValueIterator};

fn main() {
    let input = map::get_input();
    map::set_output(list_activities(input));
}

fn list_activities(input: StructuredValue) -> Result<StructuredValue, StructuredValue> {
    const LIMIT: usize = 25;

    let response = http_request(
        "POST",
        "http://example.com/api/graphql",
        map::multimap! {
            "content-type" => ["application/json"],
            "accept" => ["application/json"]
        },
        map::multimap! {},
        Some(object! {
            "query" => "
			  query Experiences($nextPage: String, $limit: Int!) {
				experiences(after: $nextPage, first: $limit) {
				  edges {
					node {
					  id
					  name
					  briefDescription
					  description
					  categories
					  keywords
					  themes
					  images {
						caption
						originalUrl
						thumbnailUrl
						previewUrl
					  }
					  videos {
						name
						sourceUrl
						thumbnailUrl
						previewUrl
					  }
					}
				  }
				  pageInfo {
					endCursor
					hasPreviousPage
				  }
				  totalCount
				}
			  }
			",
            "variables" => map::object! {
                "nextPage" => &input["page"],
                "limit" => LIMIT
            }
        }),
    )
    .map_err(|err| {
        object! {
            "message" => match err {
                HttpRequestError::Timeout => "timeout"
            }
        }
    })?;

    match (response.status(), response.content_type()) {
        (200, Some("application/json")) => {
            let body = response.body().unwrap();
            let errors = body.get("errors").map(|e| e.unwrap_array());

            let unauthorized_error = {
                errors.and_then(|errors| {
                    errors.iter().find(|err| {
                        err.get("extensions")
                            .and_then(|ext| ext.get("classification"))
                            .map(|c| c.unwrap_str() == "UnauthorizedError")
                            .unwrap_or(false)
                    })
                })
            };
            if let Some(err) = unauthorized_error {
                return Err(object! {
                    "title" => "Unauthorized Error",
                    "detail" => err
                });
            }

            if let Some(errors) = errors {
                return Err(object! {
                    "title" => "Unknown error",
                    "detail" => errors
                });
            }

            Ok(object! {
                "total" => &body["data"]["experiences"]["totalCount"],
                "nextPath" => &body["data"]["experiences"]["pageInfo"]["endCursor"],
                "activities" => body["data"]["experiences"]["edges"].iter().map(|edge| {
                    let activity = &edge["node"];

                    object! {
                        "id" => &activity["id"],
                        "name" => &activity["name"],
                        "description" => &activity["description"],
                        "shortDescription" => &activity["briefDescription"],
                        "images" => activity["images"].iter().map(|image| object! {
                            "url" => &image["originalUrl"],
                            "thumbnailUrl" => image.get("previewUrl").or_else(|| image.get("thumbnailUrl")),
                            "caption" => &image["caption"]
                        }).collect_array(),
                        "videos" => activity["videos"].iter().map(|video| object! {
                            "url" => &video["sourceUrl"],
                            "thumbnailUrl" => video.get("previewUrl").or_else(|| video.get("thumbnailUrl")),
                            "caption" => &video["name"]
                        }).collect_array(),
                        "tags" => activity["categories"].iter().chain(
                            activity["themes"].iter()
                        ).chain(
                            activity["keywords"].iter()
                        ).collect_array(),
                        "customFields" => StructuredValue::Array(vec![])
                    }
                }).collect_array()
            })
        }
        _ => unimplemented!(),
    }
}
